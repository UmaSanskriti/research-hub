from rest_framework import serializers
from .models import Paper, Review, Version, Authorship, Researcher, ImportJob, ExternalPublication


class ReviewSerializer(serializers.ModelSerializer):
    """Serializer for peer review comments"""
    class Meta:
        model = Review
        fields = '__all__'


class VersionSerializer(serializers.ModelSerializer):
    """Serializer for paper versions/drafts"""
    class Meta:
        model = Version
        fields = '__all__'


class PaperSerializer(serializers.ModelSerializer):
    """Serializer for research papers"""
    class Meta:
        model = Paper
        fields = '__all__'

    def validate_title(self, value):
        """Validate title field"""
        if not value or len(value.strip()) < 10:
            raise serializers.ValidationError("Title must be at least 10 characters long")
        if len(value) > 500:
            raise serializers.ValidationError("Title must not exceed 500 characters")
        return value.strip()

    def validate_url(self, value):
        """Validate URL field"""
        if value and value.strip():
            # URL validation is handled by URLField, but we can add custom messages
            return value.strip()
        return value

    def validate(self, data):
        """Cross-field validation"""
        # If DOI is provided, validate format
        if data.get('doi'):
            import re
            doi_pattern = r'^10\.\d{4,}\/\S+$'
            if not re.match(doi_pattern, data['doi']):
                raise serializers.ValidationError({
                    'doi': 'Invalid DOI format. Expected format: 10.XXXX/...'
                })
        return data


class ExternalPublicationSerializer(serializers.ModelSerializer):
    """Serializer for external publications stored with researchers"""
    class Meta:
        model = ExternalPublication
        fields = ['id', 'researcher', 'semantic_scholar_id', 'title', 'year',
                  'venue', 'citation_count', 'doi', 'is_imported', 'last_fetched', 'created_at']
        read_only_fields = ['id', 'last_fetched', 'created_at']


class AuthorshipSerializer(serializers.ModelSerializer):
    """Serializer for researcher-paper relationships"""
    reviews = ReviewSerializer(many=True, read_only=True)
    versions = VersionSerializer(many=True, read_only=True)

    class Meta:
        model = Authorship
        fields = '__all__'


class ResearcherSerializer(serializers.ModelSerializer):
    """Serializer for researchers with their authorships"""
    authorships = AuthorshipSerializer(many=True, read_only=True)

    class Meta:
        model = Researcher
        fields = '__all__'


class DataSerializer(serializers.Serializer):
    """Main data serializer that returns all papers and researchers"""
    papers = PaperSerializer(many=True, read_only=True)
    researchers = ResearcherSerializer(many=True, read_only=True)

    def to_representation(self, instance):
        """
        Returns all papers and researchers with nested relationships.
        This serializer fetches all data directly from the database.
        """
        return {
            'papers': PaperSerializer(Paper.objects.all(), many=True).data,
            'researchers': ResearcherSerializer(Researcher.objects.all(), many=True).data
        }


class ImportJobSerializer(serializers.ModelSerializer):
    """Serializer for import job tracking"""
    progress_percentage = serializers.ReadOnlyField()

    class Meta:
        model = ImportJob
        fields = ['id', 'status', 'total', 'processed', 'successful', 'duplicates', 'failed',
                  'errors', 'created_at', 'completed_at', 'progress_percentage']
        read_only_fields = ['id', 'created_at', 'completed_at', 'progress_percentage']