"""
Django management command to enrich all researchers in bulk
"""
import time
import logging
from django.core.management.base import BaseCommand
from django.db.models import Q
from api.models import Researcher
from api.services.researcher_enrichment_service import ResearcherEnrichmentService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Enrich all researchers with Semantic Scholar data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Re-enrich already enriched researchers',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit number of researchers to enrich (for testing)',
        )
        parser.add_argument(
            '--delay',
            type=float,
            default=1.0,
            help='Delay in seconds between each enrichment (rate limiting)',
        )

    def handle(self, *args, **options):
        force = options['force']
        limit = options['limit']
        delay = options['delay']

        # Get researchers that can be enriched
        queryset = Researcher.objects.filter(
            semantic_scholar_id__isnull=False
        ).exclude(
            semantic_scholar_id=''
        )

        # If not forcing, only enrich those without summaries
        if not force:
            queryset = queryset.filter(
                Q(summary__isnull=True) | Q(summary='')
            )

        total_count = queryset.count()

        if limit:
            queryset = queryset[:limit]
            actual_count = min(limit, total_count)
        else:
            actual_count = total_count

        self.stdout.write(
            self.style.SUCCESS(
                f'\nEnriching {actual_count} of {total_count} researchers...\n'
            )
        )

        if not force:
            self.stdout.write(
                self.style.WARNING(
                    'Skipping already enriched researchers. Use --force to re-enrich all.\n'
                )
            )

        enrichment_service = ResearcherEnrichmentService()

        success_count = 0
        error_count = 0
        skipped_count = 0

        for i, researcher in enumerate(queryset, 1):
            self.stdout.write(f'[{i}/{actual_count}] Processing: {researcher.name}')

            try:
                result = enrichment_service.enrich_researcher(researcher, force=force)

                if result['success']:
                    if result['enriched']:
                        success_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'  ✓ Enriched: {", ".join(result["fields_updated"])} '
                                f'({result.get("publications_stored", 0)} publications)'
                            )
                        )
                    else:
                        skipped_count += 1
                        self.stdout.write(
                            self.style.WARNING('  ⊘ Already enriched, skipped')
                        )
                else:
                    error_count += 1
                    errors = ', '.join(result.get('errors', ['Unknown error']))
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ Failed: {errors}')
                    )

            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(f'  ✗ Exception: {str(e)}')
                )
                logger.exception(f'Error enriching researcher {researcher.id}')

            # Rate limiting delay
            if i < actual_count:  # Don't delay after last one
                time.sleep(delay)

        # Final summary
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(self.style.SUCCESS(f'\n✓ Successfully enriched: {success_count}'))
        if skipped_count > 0:
            self.stdout.write(self.style.WARNING(f'⊘ Skipped (already enriched): {skipped_count}'))
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f'✗ Failed: {error_count}'))
        self.stdout.write(f'\nTotal processed: {success_count + error_count + skipped_count}')
        self.stdout.write('=' * 50 + '\n')
