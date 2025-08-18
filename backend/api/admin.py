from django.contrib import admin
from .models import Paper, Review, Version, Authorship, Researcher, ExternalPublication


# Inlines
class ReviewInline(admin.TabularInline):
    """Inline for managing reviews within authorship"""
    model = Review
    extra = 0
    fields = ('review_type', 'reviewer_name', 'review_date', 'summary')


class VersionInline(admin.TabularInline):
    """Inline for managing paper versions within authorship"""
    model = Version
    extra = 0
    fields = ('version_number', 'status', 'submission_date', 'summary')


class AuthorshipInline(admin.TabularInline):
    """Inline for managing authorships"""
    model = Authorship
    extra = 0
    fields = ('researcher', 'author_position', 'contribution_role', 'summary')


# ModelAdmins
class AuthorshipAdmin(admin.ModelAdmin):
    """Admin for managing authorship relationships"""
    list_display = ('paper', 'researcher', 'author_position', 'created_at', 'updated_at')
    list_filter = ('author_position', 'created_at')
    search_fields = ('paper__title', 'researcher__name', 'summary', 'contribution_role')
    inlines = [ReviewInline, VersionInline]


class PaperAdmin(admin.ModelAdmin):
    """Admin for managing research papers"""
    list_display = ('title', 'journal', 'publication_date', 'citation_count', 'created_at')
    list_filter = ('publication_date', 'journal')
    search_fields = ('title', 'abstract', 'summary', 'doi', 'keywords')
    inlines = [AuthorshipInline]
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'doi', 'url', 'avatar_url')
        }),
        ('Publication Details', {
            'fields': ('journal', 'publication_date', 'citation_count', 'keywords')
        }),
        ('Content', {
            'fields': ('abstract', 'summary')
        }),
        ('Metadata', {
            'fields': ('raw_data', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class ResearcherAdmin(admin.ModelAdmin):
    """Admin for managing researchers"""
    list_display = ('name', 'affiliation', 'h_index', 'created_at', 'updated_at')
    list_filter = ('affiliation', 'h_index')
    search_fields = ('name', 'email', 'affiliation', 'orcid_id', 'summary', 'research_interests')
    inlines = [AuthorshipInline]
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'email', 'url', 'avatar_url')
        }),
        ('Academic Profile', {
            'fields': ('affiliation', 'orcid_id', 'h_index', 'research_interests')
        }),
        ('Summary', {
            'fields': ('summary',)
        }),
        ('Metadata', {
            'fields': ('raw_data', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class ExternalPublicationAdmin(admin.ModelAdmin):
    """Admin for managing external publications"""
    list_display = ('title', 'researcher', 'year', 'venue', 'citation_count', 'is_imported', 'last_fetched')
    list_filter = ('is_imported', 'year', 'last_fetched')
    search_fields = ('title', 'researcher__name', 'venue', 'semantic_scholar_id')
    readonly_fields = ('last_fetched', 'created_at')
    list_per_page = 50

    fieldsets = (
        ('Publication Information', {
            'fields': ('title', 'semantic_scholar_id', 'year', 'venue', 'citation_count', 'doi')
        }),
        ('Relationship', {
            'fields': ('researcher', 'is_imported')
        }),
        ('Metadata', {
            'fields': ('last_fetched', 'created_at'),
            'classes': ('collapse',)
        }),
    )


# Register models with custom admin classes
admin.site.register(Paper, PaperAdmin)
admin.site.register(Researcher, ResearcherAdmin)
admin.site.register(Authorship, AuthorshipAdmin)
admin.site.register(ExternalPublication, ExternalPublicationAdmin)
admin.site.register(Review)  # Simple registration for standalone management
admin.site.register(Version)  # Simple registration for standalone management