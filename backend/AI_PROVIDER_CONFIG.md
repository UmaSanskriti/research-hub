# AI Provider Configuration Guide

The system automatically detects and uses available AI providers for generating researcher summaries. No code changes needed - just set environment variables!

## Supported Providers

1. **Azure OpenAI** (Currently Active ✓)
2. **Anthropic Claude**
3. **OpenAI**

## Provider Priority

By default, the system tries providers in this order:
1. Azure OpenAI (if configured)
2. Anthropic (if configured)
3. OpenAI (if configured)

### Custom Priority

Set a custom priority order via environment variable:
```bash
AI_PROVIDER_PRIORITY=anthropic,azure,openai
```

## Configuration

### Azure OpenAI (Recommended)

```bash
# Required
AZURE_OPENAI_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_DEPLOYMENT=gpt-4  # or gpt-5-chat, gpt-4o, etc.

# Optional (with defaults)
AZURE_OPENAI_API_VERSION=2024-12-01-preview
AZURE_OPENAI_MODEL=gpt-4
```

### Anthropic Claude

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022  # or claude-3-opus-20240229, etc.
```

### OpenAI

```bash
# Required
OPENAI_API_KEY=sk-...

# Optional
OPENAI_MODEL=gpt-4  # or gpt-3.5-turbo, gpt-4-turbo, etc.
```

## How It Works

The system:
1. ✅ Automatically detects which providers have valid credentials
2. ✅ Uses the first available provider based on priority
3. ✅ Falls back to template-based summaries if no AI is available
4. ✅ Logs which provider is being used
5. ✅ No code changes needed when switching providers!

## Testing Your Configuration

Test which provider is active:

```bash
venv/bin/python manage.py shell
```

```python
from api.services.ai_service import get_ai_service

ai = get_ai_service()
print(f"Provider: {ai.get_provider_name()}")
print(f"Available: {ai.is_available()}")
```

## Switching Providers

Just update your `.env` file and restart Django:

```bash
# Switch to Anthropic
ANTHROPIC_API_KEY=sk-ant-...
# (Comment out or remove Azure/OpenAI keys)

# Restart
pkill -f "python manage.py runserver"
venv/bin/python manage.py runserver
```

The system will automatically detect and use the new provider!

## Cost Considerations

- **Azure OpenAI**: Check your Azure usage dashboard
- **Anthropic**: ~$3 per 1M input tokens, ~$15 per 1M output tokens
- **OpenAI**: Varies by model (GPT-4 is more expensive than GPT-3.5)

For 886 researchers:
- ~886 API calls
- ~200 tokens per summary
- Total: ~177,200 tokens (~$0.50-$3 depending on provider)

## Troubleshooting

**"No AI provider configured"**
- Check your `.env` file has valid API keys
- Ensure `.env` is in the backend directory
- Restart Django server after updating `.env`

**"Authentication error"**
- Verify your API key is valid and not expired
- Check you're using the right key format for the provider
- For Azure: Ensure endpoint URL is correct

**"Rate limit exceeded"**
- Add delays between enrichments: `--delay 2.0`
- Use a higher-tier API plan
- Batch processing will automatically retry

## Adding New Providers (Future)

To add a new provider (e.g., Google Gemini, Cohere):

1. Create a new class in `ai_service.py`:
```python
class GeminiProvider(AIProvider):
    def is_configured(self) -> bool:
        return bool(os.getenv('GEMINI_API_KEY'))

    def generate_text(self, prompt, max_tokens, temperature):
        # Implementation
        pass

    def get_provider_name(self):
        return "Google Gemini"
```

2. Add to providers dict:
```python
self.providers = {
    'azure': AzureOpenAIProvider(),
    'anthropic': AnthropicProvider(),
    'openai': OpenAIProvider(),
    'gemini': GeminiProvider(),  # New!
}
```

3. That's it! Set `GEMINI_API_KEY` in `.env` and it works.
