"""
ORCID Service - Fetch and process researcher data from ORCID API
https://pub.orcid.org/v3.0/
"""
import logging
import requests
from typing import Optional, Dict, List
from datetime import datetime

logger = logging.getLogger(__name__)


class ORCIDService:
    """
    Service for fetching researcher profiles from ORCID (Open Researcher and Contributor ID)

    ORCID is the authoritative source for researcher identities and provides:
    - Verified researcher profiles
    - Employment/education history
    - Publications
    - Funding information
    - Peer review activities
    """

    BASE_URL = "https://pub.orcid.org/v3.0"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'application/json',
            'User-Agent': 'ResearchHub/1.0 (Python Requests)'
        })

    def get_orcid_profile(self, orcid_id: str) -> Optional[Dict]:
        """
        Fetch complete ORCID profile by ORCID ID.

        Args:
            orcid_id: ORCID identifier (format: 0000-0001-2345-6789)

        Returns:
            Dict with profile data, or None if not found
        """
        try:
            # Normalize ORCID ID (remove https:// if present)
            orcid_id = orcid_id.replace('https://orcid.org/', '').replace('http://orcid.org/', '')

            logger.info(f"Fetching ORCID profile for: {orcid_id}")

            url = f"{self.BASE_URL}/{orcid_id}"
            response = self.session.get(url, timeout=10)

            if response.status_code == 200:
                data = response.json()
                logger.info(f"Successfully fetched ORCID profile: {orcid_id}")
                return data
            elif response.status_code == 404:
                logger.warning(f"ORCID ID not found: {orcid_id}")
                return None
            else:
                logger.error(f"ORCID API error {response.status_code}: {response.text}")
                return None

        except Exception as e:
            logger.error(f"Error fetching ORCID profile {orcid_id}: {str(e)}")
            return None

    def search_orcid_by_name(
        self,
        name: str,
        affiliation: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict]:
        """
        Search for ORCID profiles by name and optional affiliation.

        Args:
            name: Researcher name
            affiliation: Institution name (optional, improves accuracy)
            limit: Max number of results to return

        Returns:
            List of matching profiles with ORCID IDs
        """
        try:
            # Build search query
            query_parts = [f'family-name:{name.split()[-1]}']

            if len(name.split()) > 1:
                query_parts.append(f'given-names:{name.split()[0]}')

            if affiliation:
                query_parts.append(f'affiliation-org-name:{affiliation}')

            query = ' AND '.join(query_parts)

            logger.info(f"Searching ORCID for: {query}")

            url = f"{self.BASE_URL}/search/"
            params = {
                'q': query,
                'rows': limit
            }

            response = self.session.get(url, params=params, timeout=10)

            if response.status_code == 200:
                data = response.json()
                results = []

                for result in data.get('result', []):
                    orcid_id = result.get('orcid-identifier', {}).get('path')
                    if orcid_id:
                        results.append({
                            'orcid_id': orcid_id,
                            'uri': result.get('orcid-identifier', {}).get('uri'),
                            'score': result.get('relevancy-score', {}).get('value', 0)
                        })

                logger.info(f"Found {len(results)} ORCID matches for: {name}")
                return results
            else:
                logger.error(f"ORCID search error {response.status_code}")
                return []

        except Exception as e:
            logger.error(f"Error searching ORCID for {name}: {str(e)}")
            return []

    def extract_person_info(self, profile_data: Dict) -> Dict:
        """Extract basic person information from ORCID profile."""
        person = profile_data.get('person', {})
        name_data = person.get('name', {})

        # Get name
        given_name = name_data.get('given-names', {}).get('value', '')
        family_name = name_data.get('family-name', {}).get('value', '')
        full_name = f"{given_name} {family_name}".strip()

        # Get aliases
        other_names = person.get('other-names', {}).get('other-name', [])
        aliases = [name.get('content') for name in other_names if name.get('content')]

        # Get researcher URLs
        urls = []
        researcher_urls = person.get('researcher-urls', {}).get('researcher-url', [])
        for url_item in researcher_urls:
            if url_item.get('url', {}).get('value'):
                urls.append({
                    'name': url_item.get('url-name'),
                    'url': url_item.get('url', {}).get('value')
                })

        # Get research areas/keywords
        keywords = []
        keyword_items = person.get('keywords', {}).get('keyword', [])
        for kw in keyword_items:
            if kw.get('content'):
                keywords.append(kw.get('content'))

        return {
            'full_name': full_name,
            'given_name': given_name,
            'family_name': family_name,
            'aliases': aliases,
            'urls': urls,
            'keywords': keywords
        }

    def extract_employment_history(self, profile_data: Dict) -> List[Dict]:
        """Extract employment history from ORCID profile."""
        activities = profile_data.get('activities-summary', {})
        employments = activities.get('employments', {}).get('affiliation-group', [])

        history = []
        for group in employments:
            for summary_item in group.get('summaries', []):
                employment = summary_item.get('employment-summary', {})

                org = employment.get('organization', {})
                start_date = employment.get('start-date')
                end_date = employment.get('end-date')

                history.append({
                    'institution': org.get('name'),
                    'department': employment.get('department-name'),
                    'role': employment.get('role-title'),
                    'start_year': start_date.get('year', {}).get('value') if start_date else None,
                    'end_year': end_date.get('year', {}).get('value') if end_date else None,
                    'ror_id': org.get('disambiguated-organization', {}).get('disambiguated-organization-identifier')
                        if org.get('disambiguated-organization', {}).get('disambiguation-source') == 'ROR' else None
                })

        return history

    def extract_education_history(self, profile_data: Dict) -> List[Dict]:
        """Extract education history from ORCID profile."""
        activities = profile_data.get('activities-summary', {})
        educations = activities.get('educations', {}).get('affiliation-group', [])

        history = []
        for group in educations:
            for summary_item in group.get('summaries', []):
                education = summary_item.get('education-summary', {})

                org = education.get('organization', {})
                start_date = education.get('start-date')
                end_date = education.get('end-date')

                history.append({
                    'institution': org.get('name'),
                    'department': education.get('department-name'),
                    'degree': education.get('role-title'),
                    'start_year': start_date.get('year', {}).get('value') if start_date else None,
                    'end_year': end_date.get('year', {}).get('value') if end_date else None
                })

        return history

    def extract_funding(self, profile_data: Dict) -> List[Dict]:
        """Extract funding/grants from ORCID profile."""
        activities = profile_data.get('activities-summary', {})
        funding_groups = activities.get('fundings', {}).get('group', [])

        grants = []
        for group in funding_groups:
            for summary_item in group.get('funding-summary', []):
                org = summary_item.get('organization', {})
                start_date = summary_item.get('start-date')
                end_date = summary_item.get('end-date')

                grants.append({
                    'title': summary_item.get('title', {}).get('title', {}).get('value'),
                    'funder': org.get('name'),
                    'grant_number': summary_item.get('external-ids', {}).get('external-id', [{}])[0].get('external-id-value')
                        if summary_item.get('external-ids', {}).get('external-id') else None,
                    'start_year': start_date.get('year', {}).get('value') if start_date else None,
                    'end_year': end_date.get('year', {}).get('value') if end_date else None
                })

        return grants

    def extract_works_count(self, profile_data: Dict) -> int:
        """Extract total works/publications count from ORCID profile."""
        activities = profile_data.get('activities-summary', {})
        works = activities.get('works', {}).get('group', [])
        return len(works)

    def enrich_researcher_with_orcid(self, orcid_id: str) -> Optional[Dict]:
        """
        Fetch and extract all relevant data from an ORCID profile.

        Returns a structured dict ready for researcher enrichment.
        """
        profile = self.get_orcid_profile(orcid_id)

        if not profile:
            return None

        try:
            person_info = self.extract_person_info(profile)
            employment = self.extract_employment_history(profile)
            education = self.extract_education_history(profile)
            funding = self.extract_funding(profile)
            works_count = self.extract_works_count(profile)

            # Get current affiliation (most recent employment)
            current_affiliation = None
            current_position = None
            if employment:
                # Sort by end_year (None means current)
                current_jobs = [e for e in employment if e['end_year'] is None]
                if current_jobs:
                    current_affiliation = current_jobs[0]['institution']
                    current_position = current_jobs[0]['role']
                elif employment:
                    # If no current job, use most recent
                    sorted_employment = sorted(employment,
                                             key=lambda x: x['end_year'] or 9999,
                                             reverse=True)
                    current_affiliation = sorted_employment[0]['institution']
                    current_position = sorted_employment[0]['role']

            return {
                'orcid_id': orcid_id,
                'name': person_info['full_name'],
                'aliases': person_info['aliases'],
                'affiliation': current_affiliation,
                'current_position': current_position,
                'affiliation_history': employment,
                'education_history': education,
                'funding': funding,
                'paper_count': works_count,
                'research_interests': person_info['keywords'],
                'urls': person_info['urls'],
                'raw_orcid': profile
            }

        except Exception as e:
            logger.error(f"Error extracting ORCID data for {orcid_id}: {str(e)}")
            return None
