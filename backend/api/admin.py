from django.contrib import admin
from .models import Repository, Issue, Commit, RepositoryWork, Contributor

# Inlines
class IssueInline(admin.TabularInline):
    model = Issue
    extra = 0 # Don't show extra empty forms

class CommitInline(admin.TabularInline):
    model = Commit
    extra = 0

class RepositoryWorkInline(admin.TabularInline):
    model = RepositoryWork
    extra = 0
    # Optionally specify fields to display in the inline form
    # fields = ('contributor', 'summary', 'created_at', 'updated_at')
    # readonly_fields = ('created_at', 'updated_at')

# ModelAdmins
class RepositoryWorkAdmin(admin.ModelAdmin):
    list_display = ('repository', 'contributor', 'created_at', 'updated_at')
    list_filter = ('repository', 'contributor')
    search_fields = ('repository__name', 'contributor__username', 'summary')
    inlines = [IssueInline, CommitInline]

class RepositoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'url', 'created_at', 'updated_at')
    search_fields = ('name', 'summary', 'url')
    inlines = [RepositoryWorkInline]

class ContributorAdmin(admin.ModelAdmin):
    list_display = ('username', 'url', 'created_at', 'updated_at')
    search_fields = ('username', 'summary', 'url')
    inlines = [RepositoryWorkInline]

# Unregister default admins if they were registered before
# (This part is only needed if you previously registered them without ModelAdmin classes)
# try:
#     admin.site.unregister(Repository)
#     admin.site.unregister(Issue)
#     admin.site.unregister(Commit)
#     admin.site.unregister(RepositoryWork)
#     admin.site.unregister(Contributor)
# except admin.sites.NotRegistered:
#     pass

# Register your models here with the custom ModelAdmin classes
admin.site.register(Repository, RepositoryAdmin)
admin.site.register(Issue) # Issues can be managed via RepositoryWork inline
admin.site.register(Commit) # Commits can be managed via RepositoryWork inline
admin.site.register(RepositoryWork, RepositoryWorkAdmin)
admin.site.register(Contributor, ContributorAdmin)