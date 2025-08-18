"""
Django signals for automatic paper enrichment
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings

from api.models import Paper, Researcher

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Paper)
def enrich_paper_on_creation(sender, instance, created, **kwargs):
    """
    Automatically enrich papers when they are created.

    This signal is triggered after a Paper is saved. It only runs enrichment
    for newly created papers (not updates) and only if the paper doesn't
    already have a Semantic Scholar ID.

    To disable auto-enrichment temporarily, set:
    settings.AUTO_ENRICH_PAPERS = False
    """
    # Only enrich new papers
    if not created:
        return

    # Check if auto-enrichment is enabled (default: True)
    if not getattr(settings, 'AUTO_ENRICH_PAPERS', True):
        logger.info(f"Auto-enrichment disabled, skipping paper: {instance.title[:50]}")
        return

    # Skip if already enriched
    if instance.semantic_scholar_id:
        logger.info(f"Paper already enriched, skipping: {instance.title[:50]}")
        return

    # Import here to avoid circular imports
    from api.services.enrichment_service import PaperEnrichmentService

    try:
        logger.info(f"Auto-enriching new paper: {instance.title[:50]}")
        enrichment_service = PaperEnrichmentService()
        result = enrichment_service.enrich_paper(instance)

        if result['success']:
            logger.info(
                f"Successfully enriched paper '{instance.title[:50]}' - "
                f"Abstract from: {result['abstract_source']}, "
                f"Researchers: {result['researchers_created']} created, "
                f"Authorships: {result['authorships_created']} created"
            )
        else:
            logger.warning(
                f"Failed to enrich paper '{instance.title[:50]}': {result['errors']}"
            )

    except Exception as e:
        # Log error but don't fail the paper creation
        logger.error(f"Error in auto-enrichment for paper '{instance.title[:50]}': {str(e)}")


@receiver(post_save, sender=Researcher)
def enrich_researcher_on_creation(sender, instance, created, **kwargs):
    """
    Automatically enrich researchers when they are created.

    This signal is triggered after a Researcher is saved. It only runs enrichment
    for newly created researchers (not updates) and only if the researcher has
    a Semantic Scholar ID.

    To disable auto-enrichment temporarily, set:
    settings.AUTO_ENRICH_RESEARCHERS = False
    """
    # Only enrich new researchers
    if not created:
        return

    # Check if auto-enrichment is enabled (default: True)
    if not getattr(settings, 'AUTO_ENRICH_RESEARCHERS', True):
        logger.info(f"Auto-enrichment disabled, skipping researcher: {instance.name}")
        return

    # Only enrich if we have a Semantic Scholar ID
    if not instance.semantic_scholar_id:
        logger.info(f"No Semantic Scholar ID, skipping researcher: {instance.name}")
        return

    # Skip if already enriched (has summary and research interests)
    if instance.summary and instance.research_interests:
        logger.info(f"Researcher already enriched, skipping: {instance.name}")
        return

    # Import here to avoid circular imports
    from api.services.researcher_enrichment_service import ResearcherEnrichmentService

    try:
        logger.info(f"Auto-enriching new researcher: {instance.name}")
        enrichment_service = ResearcherEnrichmentService()
        result = enrichment_service.enrich_researcher(instance, force=True)

        if result['success']:
            logger.info(
                f"Successfully enriched researcher '{instance.name}' - "
                f"Fields updated: {', '.join(result['fields_updated'])}, "
                f"Research interests: {result.get('research_interests_count', 0)}, "
                f"Publications stored: {result.get('publications_stored', 0)}"
            )
        else:
            logger.warning(
                f"Failed to enrich researcher '{instance.name}': {result['errors']}"
            )

    except Exception as e:
        # Log error but don't fail the researcher creation
        logger.error(f"Error in auto-enrichment for researcher '{instance.name}': {str(e)}")
