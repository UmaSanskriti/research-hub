import json
import os
from datetime import datetime

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import Paper, Researcher, Authorship, Version, Review


class Command(BaseCommand):
    help = 'Populates the database with research papers and researchers from a JSON file.'

    def add_arguments(self, parser):
        parser.add_argument(
            'json_file',
            type=str,
            help='Path to the JSON file containing the research data.',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data in the related tables before populating.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        json_file_path = options['json_file']
        clear_data = options['clear']

        if not os.path.exists(json_file_path):
            raise CommandError(f"JSON file not found at: {json_file_path}")

        try:
            with open(json_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            raise CommandError(f"Error decoding JSON file: {e}")
        except IOError as e:
            raise CommandError(f"Error reading JSON file: {e}")

        if clear_data:
            self.stdout.write(self.style.WARNING("Clearing existing data..."))
            # Clear in reverse order of dependencies
            Review.objects.all().delete()
            Version.objects.all().delete()
            Authorship.objects.all().delete()
            Paper.objects.all().delete()
            Researcher.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Existing data cleared."))

        self.stdout.write(f"Starting population from {json_file_path}...")

        # Caches to store created objects by their original IDs
        paper_cache = {}
        researcher_cache = {}
        authorship_cache = {}

        # Counters
        paper_count = 0
        researcher_count = 0
        authorship_count = 0
        version_count = 0
        review_count = 0

        # --- 1. Create Researchers ---
        researchers_data = data.get('researchers', [])
        self.stdout.write(f"Creating {len(researchers_data)} researchers...")

        for researcher_data in researchers_data:
            researcher_id = researcher_data.get('id')
            name = researcher_data.get('name')

            if not name:
                continue

            researcher = Researcher.objects.create(
                name=name,
                email=researcher_data.get('email', ''),
                affiliation=researcher_data.get('affiliation', ''),
                orcid_id=researcher_data.get('orcid_id'),
                h_index=researcher_data.get('h_index', 0),
                research_interests=researcher_data.get('research_interests', []),
                url=researcher_data.get('url', ''),
                avatar_url=researcher_data.get('avatar_url', ''),
                summary=researcher_data.get('summary', ''),
                raw_data=researcher_data
            )
            researcher_cache[researcher_id] = researcher
            researcher_count += 1

        self.stdout.write(self.style.SUCCESS(f"Created {researcher_count} researchers."))

        # --- 2. Create Papers ---
        papers_data = data.get('papers', [])
        self.stdout.write(f"Creating {len(papers_data)} papers...")

        for paper_data in papers_data:
            paper_id = paper_data.get('id')
            title = paper_data.get('title')

            if not title:
                continue

            # Parse publication date
            pub_date_str = paper_data.get('publication_date')
            pub_date = None
            if pub_date_str:
                try:
                    pub_date = datetime.strptime(pub_date_str, '%Y-%m-%d').date()
                except ValueError:
                    pass

            paper = Paper.objects.create(
                title=title,
                doi=paper_data.get('doi', ''),
                abstract=paper_data.get('abstract', ''),
                publication_date=pub_date,
                journal=paper_data.get('journal', ''),
                citation_count=paper_data.get('citation_count', 0),
                keywords=paper_data.get('keywords', []),
                url=paper_data.get('url', ''),
                avatar_url=paper_data.get('avatar_url', ''),
                summary=paper_data.get('summary', ''),
                raw_data=paper_data
            )
            paper_cache[paper_id] = paper
            paper_count += 1

        self.stdout.write(self.style.SUCCESS(f"Created {paper_count} papers."))

        # --- 3. Create Authorships ---
        authorships_data = data.get('authorships', [])
        self.stdout.write(f"Creating {len(authorships_data)} authorships...")

        for authorship_data in authorships_data:
            authorship_id = authorship_data.get('id')
            paper_id = authorship_data.get('paper')
            researcher_id = authorship_data.get('researcher')

            paper = paper_cache.get(paper_id)
            researcher = researcher_cache.get(researcher_id)

            if not paper or not researcher:
                self.stdout.write(
                    self.style.WARNING(
                        f"Skipping authorship {authorship_id}: Paper or Researcher not found"
                    )
                )
                continue

            # Use get_or_create to handle duplicate authorships
            authorship, created = Authorship.objects.get_or_create(
                paper=paper,
                researcher=researcher,
                defaults={
                    'author_position': authorship_data.get('author_position', ''),
                    'contribution_role': authorship_data.get('contribution_role', ''),
                    'summary': authorship_data.get('summary', '')
                }
            )
            authorship_cache[authorship_id] = authorship
            if created:
                authorship_count += 1

        self.stdout.write(self.style.SUCCESS(f"Created {authorship_count} authorships."))

        # --- 4. Create Versions ---
        versions_data = data.get('versions', [])
        self.stdout.write(f"Creating {len(versions_data)} versions...")

        for version_data in versions_data:
            authorship_id = version_data.get('authorship')
            authorship = authorship_cache.get(authorship_id)

            if not authorship:
                continue

            # Parse submission date
            sub_date_str = version_data.get('submission_date')
            sub_date = None
            if sub_date_str:
                try:
                    sub_date = datetime.strptime(sub_date_str, '%Y-%m-%d').date()
                except ValueError:
                    pass

            Version.objects.create(
                authorship=authorship,
                version_number=version_data.get('version_number', ''),
                submission_date=sub_date,
                status=version_data.get('status', 'draft'),
                url=version_data.get('url', ''),
                summary=version_data.get('summary', ''),
                raw_data=version_data
            )
            version_count += 1

        self.stdout.write(self.style.SUCCESS(f"Created {version_count} versions."))

        # --- 5. Create Reviews ---
        reviews_data = data.get('reviews', [])
        self.stdout.write(f"Creating {len(reviews_data)} reviews...")

        for review_data in reviews_data:
            authorship_id = review_data.get('authorship')
            authorship = authorship_cache.get(authorship_id)

            if not authorship:
                continue

            # Parse review date
            review_date_str = review_data.get('review_date')
            review_date = None
            if review_date_str:
                try:
                    review_date = datetime.strptime(review_date_str, '%Y-%m-%d').date()
                except ValueError:
                    pass

            Review.objects.create(
                authorship=authorship,
                reviewer_name=review_data.get('reviewer_name', ''),
                review_date=review_date,
                review_type=review_data.get('review_type', 'peer_review'),
                url=review_data.get('url'),
                summary=review_data.get('summary', ''),
                raw_data=review_data
            )
            review_count += 1

        self.stdout.write(self.style.SUCCESS(f"Created {review_count} reviews."))

        # --- Summary ---
        self.stdout.write(self.style.SUCCESS("\n=== Database Population Summary ==="))
        self.stdout.write(f"✓ {researcher_count} researchers")
        self.stdout.write(f"✓ {paper_count} papers")
        self.stdout.write(f"✓ {authorship_count} authorships")
        self.stdout.write(f"✓ {version_count} versions")
        self.stdout.write(f"✓ {review_count} reviews")
        self.stdout.write(self.style.SUCCESS("\nDatabase population completed successfully!"))
