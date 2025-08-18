"""
AI Service - Provider-agnostic interface for AI text generation
Automatically detects and uses available AI providers (Azure OpenAI, Anthropic, OpenAI)
"""
import os
import logging
from abc import ABC, abstractmethod
from typing import Optional, List, Dict
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class AIProvider(ABC):
    """Abstract base class for AI providers"""

    @abstractmethod
    def is_configured(self) -> bool:
        """Check if this provider is properly configured with credentials"""
        pass

    @abstractmethod
    def generate_text(
        self,
        prompt: str,
        max_tokens: int = 200,
        temperature: float = 0.7
    ) -> str:
        """Generate text using the AI provider"""
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """Get the name of this provider"""
        pass


class AzureOpenAIProvider(AIProvider):
    """Azure OpenAI implementation"""

    def __init__(self):
        self.endpoint = os.getenv('AZURE_OPENAI_ENDPOINT')
        self.api_key = os.getenv('AZURE_OPENAI_API_KEY')
        self.api_version = os.getenv('AZURE_OPENAI_API_VERSION', '2024-12-01-preview')
        self.deployment = os.getenv('AZURE_OPENAI_DEPLOYMENT', 'gpt-4')
        self.client = None

        if self.is_configured():
            from openai import AzureOpenAI
            self.client = AzureOpenAI(
                azure_endpoint=self.endpoint,
                api_key=self.api_key,
                api_version=self.api_version
            )

    def is_configured(self) -> bool:
        return bool(self.endpoint and self.api_key)

    def generate_text(self, prompt: str, max_tokens: int = 200, temperature: float = 0.7) -> str:
        try:
            response = self.client.chat.completions.create(
                model=self.deployment,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=temperature
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Azure OpenAI error: {str(e)}")
            raise

    def get_provider_name(self) -> str:
        return f"Azure OpenAI ({self.deployment})"


class AnthropicProvider(AIProvider):
    """Anthropic Claude implementation"""

    def __init__(self):
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        self.model = os.getenv('ANTHROPIC_MODEL', 'claude-3-5-sonnet-20241022')
        self.client = None

        if self.is_configured():
            from anthropic import Anthropic
            self.client = Anthropic(api_key=self.api_key)

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def generate_text(self, prompt: str, max_tokens: int = 200, temperature: float = 0.7) -> str:
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text.strip()
        except Exception as e:
            logger.error(f"Anthropic error: {str(e)}")
            raise

    def get_provider_name(self) -> str:
        return f"Anthropic ({self.model})"


class OpenAIProvider(AIProvider):
    """Standard OpenAI implementation"""

    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.model = os.getenv('OPENAI_MODEL', 'gpt-4')
        self.client = None

        if self.is_configured():
            from openai import OpenAI
            self.client = OpenAI(api_key=self.api_key)

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def generate_text(self, prompt: str, max_tokens: int = 200, temperature: float = 0.7) -> str:
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=temperature
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"OpenAI error: {str(e)}")
            raise

    def get_provider_name(self) -> str:
        return f"OpenAI ({self.model})"


class AIService:
    """
    Main AI service that automatically detects and uses available providers.
    Priority order: Azure OpenAI > Anthropic > OpenAI
    """

    # Provider priority order (can be customized via env var)
    DEFAULT_PRIORITY = ['azure', 'anthropic', 'openai']

    def __init__(self, provider_priority: Optional[List[str]] = None):
        """
        Initialize AI service with automatic provider detection.

        Args:
            provider_priority: List of provider names in priority order.
                             If None, uses DEFAULT_PRIORITY or AI_PROVIDER_PRIORITY env var.
        """
        # Get provider priority from env or use provided/default
        env_priority = os.getenv('AI_PROVIDER_PRIORITY')
        if env_priority:
            self.provider_priority = [p.strip().lower() for p in env_priority.split(',')]
        elif provider_priority:
            self.provider_priority = [p.lower() for p in provider_priority]
        else:
            self.provider_priority = self.DEFAULT_PRIORITY

        # Initialize all providers
        self.providers = {
            'azure': AzureOpenAIProvider(),
            'anthropic': AnthropicProvider(),
            'openai': OpenAIProvider()
        }

        # Select the first configured provider
        self.active_provider = self._select_provider()

        if self.active_provider:
            logger.info(f"AI Service initialized with: {self.active_provider.get_provider_name()}")
        else:
            logger.warning("No AI provider configured. Summaries will use template fallback.")

    def _select_provider(self) -> Optional[AIProvider]:
        """Select the first configured provider based on priority"""
        for provider_name in self.provider_priority:
            provider = self.providers.get(provider_name)
            if provider and provider.is_configured():
                return provider
        return None

    def is_available(self) -> bool:
        """Check if any AI provider is available"""
        return self.active_provider is not None

    def get_provider_name(self) -> str:
        """Get the name of the active provider"""
        if self.active_provider:
            return self.active_provider.get_provider_name()
        return "None (No provider configured)"

    def generate_summary(
        self,
        prompt: str,
        max_tokens: int = 200,
        temperature: float = 0.7
    ) -> Optional[str]:
        """
        Generate text summary using the active AI provider.

        Args:
            prompt: The prompt to send to the AI
            max_tokens: Maximum tokens in the response
            temperature: Sampling temperature (0.0-1.0)

        Returns:
            Generated text, or None if generation fails
        """
        if not self.active_provider:
            logger.warning("No AI provider available for summary generation")
            return None

        try:
            return self.active_provider.generate_text(prompt, max_tokens, temperature)
        except Exception as e:
            logger.error(f"Error generating summary with {self.get_provider_name()}: {str(e)}")
            return None

    def generate_researcher_summary(
        self,
        researcher_name: str,
        affiliation: Optional[str] = None,
        h_index: Optional[int] = None,
        paper_count: Optional[int] = None,
        research_areas: Optional[List[str]] = None
    ) -> Optional[str]:
        """
        Generate a summary for a researcher profile.

        This is a convenience method with a pre-built prompt template.
        """
        affiliation_str = affiliation or 'an academic institution'
        h_index_str = h_index or 0
        paper_count_str = paper_count or 0
        areas_str = ', '.join(research_areas[:5]) if research_areas else 'various research areas'

        prompt = f"""Write a concise 2-3 sentence summary for researcher {researcher_name}.

Details:
- Affiliation: {affiliation_str}
- h-index: {h_index_str}
- Publications: {paper_count_str}
- Research areas: {areas_str}

The summary should:
- Highlight their main research contributions and expertise
- Be professional and factual
- Start with their name
- Be suitable for an academic profile

Example format: "[Name] is a researcher at [institution] specializing in [areas]. Their work focuses on [key contributions], with [impact metric]. They have made significant contributions to [field]."""

        return self.generate_summary(prompt, max_tokens=200, temperature=0.7)


# Singleton instance for easy import
_ai_service_instance = None

def get_ai_service() -> AIService:
    """Get the singleton AI service instance"""
    global _ai_service_instance
    if _ai_service_instance is None:
        _ai_service_instance = AIService()
    return _ai_service_instance
