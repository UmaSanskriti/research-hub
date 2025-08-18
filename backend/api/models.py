from django.db import models
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError
import re

# Create your models here.


class Paper(models.Model):
    """Represents a research paper/publication"""
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=500)
    doi = models.CharField(max_length=255, blank=True, null=True, help_text="Digital Object Identifier")
    abstract = models.TextField(blank=True, null=True, default="", help_text="Paper abstract")
    publication_date = models.DateField(blank=True, null=True)
    journal = models.CharField(max_length=255, blank=True, null=True, help_text="Journal or conference name")
    citation_count = models.IntegerField(default=0)
    keywords = models.JSONField(default=list, blank=True, help_text="List of keywords/topics")
    url = models.URLField(blank=True, null=True, default="", help_text="Link to paper (arXiv, DOI resolver, etc.)")
    avatar_url = models.URLField(blank=True, null=True, help_text="Journal/publisher logo")
    summary = models.TextField(blank=True, null=True, default="", help_text="AI-generated summary of the paper")
    semantic_scholar_id = models.CharField(max_length=255, blank=True, null=True, unique=True, db_index=True, help_text="Semantic Scholar paper ID")
    raw_data = models.JSONField(blank=True, null=True, help_text="Raw API response data")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-publication_date', '-citation_count']
        indexes = [
            models.Index(fields=['-publication_date']),
            models.Index(fields=['-citation_count']),
        ]

    def __str__(self):
        return self.title

    def clean(self):
        """Validate DOI format if provided"""
        if self.doi:
            # Basic DOI format validation
            doi_pattern = r'^10\.\d{4,}\/\S+$'
            if not re.match(doi_pattern, self.doi):
                raise ValidationError({'doi': 'Invalid DOI format'})


class Researcher(models.Model):
    """Represents a researcher/academic author"""
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True)

    # Primary affiliation (current)
    affiliation = models.CharField(max_length=255, blank=True, null=True, help_text="Current university or institution")
    current_position = models.CharField(max_length=255, blank=True, null=True, help_text="Current job title")

    # Affiliation history (from ORCID, OpenAlex)
    affiliations = models.JSONField(default=list, blank=True, help_text="Full list of affiliations: [{name, years, ror_id}]")
    affiliation_history = models.JSONField(default=list, blank=True, help_text="Career history: [{institution, role, start_year, end_year, ror_id}]")

    # Name variants
    aliases = models.JSONField(default=list, blank=True, help_text="Alternative name spellings")

    # External IDs
    orcid_id = models.CharField(max_length=19, blank=True, null=True, unique=True, db_index=True, help_text="ORCID identifier")
    semantic_scholar_id = models.CharField(max_length=255, blank=True, null=True, unique=True, db_index=True, help_text="Semantic Scholar author ID")
    openalex_id = models.CharField(max_length=255, blank=True, null=True, db_index=True, help_text="OpenAlex author ID")
    dblp_pid = models.CharField(max_length=50, blank=True, null=True, help_text="DBLP person ID")
    scopus_id = models.CharField(max_length=255, blank=True, null=True, help_text="Scopus author ID")
    github_username = models.CharField(max_length=100, blank=True, null=True, help_text="GitHub username")

    # Metrics
    h_index = models.IntegerField(default=0, help_text="h-index metric")
    i10_index = models.IntegerField(default=0, help_text="i10-index (papers with 10+ citations)")
    paper_count = models.IntegerField(default=0, help_text="Total number of publications")
    total_citations = models.IntegerField(default=0, help_text="Total citation count")

    # Research areas
    research_interests = models.JSONField(default=list, blank=True, help_text="List of research interests/topics")
    research_concepts = models.JSONField(default=list, blank=True, help_text="Research concepts with scores: [{concept, score, level}]")
    primary_research_area = models.CharField(max_length=100, blank=True, null=True, help_text="Main research field")

    # Profile content
    url = models.URLField(blank=True, null=True, help_text="Link to researcher profile (Google Scholar, personal page, etc.)")
    avatar_url = models.URLField(blank=True, null=True)
    summary = models.TextField(blank=True, null=True, help_text="AI-generated summary of researcher's work")
    research_statement = models.TextField(blank=True, null=True, help_text="Research statement or bio")

    # Data quality and provenance
    last_enriched = models.DateTimeField(blank=True, null=True, help_text="When this profile was last enriched")
    data_sources = models.JSONField(default=list, blank=True, help_text="List of data sources used: ['semantic_scholar', 'orcid', ...]")
    data_quality_score = models.FloatField(default=0.0, help_text="Completeness score (0-100)")
    verified = models.BooleanField(default=False, help_text="Whether profile has been verified")

    # Raw API responses
    raw_data = models.JSONField(blank=True, null=True, help_text="Raw API response data from all sources")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-h_index', 'name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['-h_index']),
            models.Index(fields=['-total_citations']),
            models.Index(fields=['-paper_count']),
            models.Index(fields=['last_enriched']),
        ]

    def __str__(self):
        return f"{self.name} ({self.affiliation or 'No affiliation'})"

    def clean(self):
        """Validate ORCID format if provided"""
        if self.orcid_id:
            # ORCID format: 0000-0000-0000-0000
            orcid_pattern = r'^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$'
            if not re.match(orcid_pattern, self.orcid_id):
                raise ValidationError({'orcid_id': 'Invalid ORCID format. Expected: 0000-0000-0000-0000'})


class ExternalPublication(models.Model):
    """Stores external publications fetched from Semantic Scholar for researchers.
    These are separate from Paper model - they represent all publications by a researcher
    that are NOT yet imported into the literature review collection.
    """
    id = models.AutoField(primary_key=True)
    researcher = models.ForeignKey(Researcher, on_delete=models.CASCADE, related_name='external_publications')
    semantic_scholar_id = models.CharField(max_length=255, db_index=True, help_text="Semantic Scholar paper ID")
    title = models.CharField(max_length=500)
    year = models.IntegerField(blank=True, null=True, help_text="Publication year")
    venue = models.CharField(max_length=255, blank=True, null=True, help_text="Journal/conference name")
    citation_count = models.IntegerField(default=0)
    doi = models.CharField(max_length=255, blank=True, null=True, help_text="Digital Object Identifier")
    is_imported = models.BooleanField(default=False, help_text="Whether this paper has been imported to Paper model")
    last_fetched = models.DateTimeField(auto_now=True, help_text="When this data was last fetched from API")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['researcher', 'semantic_scholar_id']
        ordering = ['-year', '-citation_count']
        indexes = [
            models.Index(fields=['researcher', '-year']),
            models.Index(fields=['researcher', 'semantic_scholar_id']),
            models.Index(fields=['last_fetched']),
        ]

    def __str__(self):
        return f"{self.researcher.name} - {self.title[:50]}"


class Authorship(models.Model):
    """Represents the relationship between a researcher and a paper (authorship)"""
    id = models.AutoField(primary_key=True)
    paper = models.ForeignKey(Paper, on_delete=models.CASCADE, related_name='authorships')
    researcher = models.ForeignKey(Researcher, on_delete=models.CASCADE, related_name='authorships')
    author_position = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Author position (first, corresponding, etc.)"
    )
    contribution_role = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Specific contribution (methodology, analysis, etc.)"
    )
    summary = models.TextField(help_text="Summary of this researcher's specific contributions to this paper")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['paper', 'researcher']
        ordering = ['paper', 'id']

    def __str__(self):
        return f"{self.researcher.name} - {self.paper.title[:50]}"


class Version(models.Model):
    """Represents different versions/drafts of a paper"""
    id = models.AutoField(primary_key=True)
    authorship = models.ForeignKey(Authorship, on_delete=models.CASCADE, related_name='versions')
    version_number = models.CharField(max_length=50, help_text="Version identifier (v1, v2, etc.)")
    submission_date = models.DateField(blank=True, null=True)
    status = models.CharField(
        max_length=50,
        choices=[
            ('draft', 'Draft'),
            ('submitted', 'Submitted'),
            ('under_review', 'Under Review'),
            ('accepted', 'Accepted'),
            ('published', 'Published'),
        ],
        default='draft'
    )
    url = models.URLField(help_text="Link to this version")
    summary = models.TextField(help_text="Changes in this version")
    raw_data = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-submission_date']

    def __str__(self):
        return f"{self.authorship.paper.title[:30]} - {self.version_number}"


class Review(models.Model):
    """Represents peer review comments or revision requests"""
    id = models.AutoField(primary_key=True)
    authorship = models.ForeignKey(Authorship, on_delete=models.CASCADE, related_name='reviews')
    reviewer_name = models.CharField(max_length=255, blank=True, null=True)
    review_date = models.DateField(blank=True, null=True)
    review_type = models.CharField(
        max_length=50,
        choices=[
            ('peer_review', 'Peer Review'),
            ('revision_request', 'Revision Request'),
            ('acceptance', 'Acceptance'),
            ('rejection', 'Rejection'),
        ],
        default='peer_review'
    )
    url = models.URLField(blank=True, null=True, help_text="Link to review if available")
    summary = models.TextField(help_text="Summary of review comments")
    raw_data = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-review_date']

    def __str__(self):
        return f"Review of {self.authorship.paper.title[:30]} ({self.review_type})"


class ImportJob(models.Model):
    """Represents a bulk import job for papers"""
    STATUS_CHOICES = [
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.AutoField(primary_key=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='processing')
    total = models.IntegerField(help_text="Total number of papers to import")
    processed = models.IntegerField(default=0, help_text="Number of papers processed so far")
    successful = models.IntegerField(default=0, help_text="Number of successfully imported papers")
    duplicates = models.IntegerField(default=0, help_text="Number of duplicate papers skipped")
    failed = models.IntegerField(default=0, help_text="Number of failed imports")
    errors = models.JSONField(default=list, blank=True, help_text="List of errors: [{title, error}]")
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True, help_text="When the job finished")

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Import Job {self.id} - {self.status} ({self.successful} success, {self.duplicates} duplicates, {self.failed} failed / {self.total} total)"

    @property
    def progress_percentage(self):
        """Calculate progress percentage"""
        if self.total == 0:
            return 0
        return int((self.processed / self.total) * 100)
