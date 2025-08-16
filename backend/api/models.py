from django.db import models

# Create your models here.


class Repository(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    avatar_url = models.URLField()
    url = models.URLField()
    summary = models.TextField()
    raw_data = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    

    
class Contributor(models.Model):
    id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=255, unique=True)
    url = models.URLField()
    avatar_url = models.URLField()
    summary = models.TextField()    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.username

class RepositoryWork(models.Model):
    id = models.AutoField(primary_key=True)
    repository = models.ForeignKey(Repository, on_delete=models.CASCADE)
    contributor = models.ForeignKey(Contributor, on_delete=models.CASCADE, related_name='works')
    summary = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.contributor.username} - {self.repository.name}"
    
class Issue(models.Model):
    id = models.AutoField(primary_key=True)
    work = models.ForeignKey(RepositoryWork, on_delete=models.CASCADE, related_name='issues')
    url = models.URLField()
    raw_data = models.JSONField()
    summary = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Commit(models.Model):
    id = models.AutoField(primary_key=True)
    work = models.ForeignKey(RepositoryWork, on_delete=models.CASCADE, related_name='commits')
    url = models.URLField()
    raw_data = models.JSONField()
    summary = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
