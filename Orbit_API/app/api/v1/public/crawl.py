from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.v1.public.auth import require_chat_user
from app.core.config import settings
from app.core.rate_limit import enforce_rate_limit
from app.models import User
from app.schemas import CrawlRequest, CrawlResponse, CrawledPageResponse
from app.services.crawl import CrawlOptions, crawl_web
from app.services.rag.webpage_extract import WebpageExtractError

router = APIRouter(prefix="/crawl", tags=["crawl"])


@router.post("", response_model=CrawlResponse)
async def crawl_webpages(
    request: Request,
    body: CrawlRequest,
    user: User = Depends(require_chat_user),
):
    """Recursively scrape a site: each page's links are fetched one-by-one until done or capped."""
    _ = user  # authenticated; per-user rate limit keyed by request
    enforce_rate_limit(
        request,
        scope="web-crawl",
        limit=settings.rate_limit_crawl_per_minute,
    )

    try:
        result = await crawl_web(
            body.url,
            CrawlOptions(
                max_depth=body.max_depth,
                max_pages=body.max_pages,
                same_origin_only=body.same_origin_only,
                include_links=body.include_links,
                follow_links=body.follow_links,
                path_prefix_scope=body.path_prefix_scope,
                auto_doc_scope=body.auto_doc_scope,
                complete=body.complete,
                fetch_retries=body.fetch_retries,
            ),
        )
    except WebpageExtractError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if not result.pages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pages could be crawled from that URL.",
        )

    return CrawlResponse(
        start_url=result.start_url,
        pages=[
            CrawledPageResponse(
                url=page.url,
                title=page.title,
                text=page.text,
                depth=page.depth,
                links=page.links,
            )
            for page in result.pages
        ],
        page_count=len(result.pages),
        truncated=result.truncated,
        failed_urls=result.failed_urls,
        combined_text=result.combined_text,
        pending_urls=result.pending_urls,
        pending_url_list=result.pending_url_list,
        max_pages_limit=result.max_pages_limit,
    )
