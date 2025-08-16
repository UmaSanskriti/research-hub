import datetime

# Helper function to generate timestamps
def generate_timestamps():
    now = datetime.datetime.now(datetime.timezone.utc)
    # Make created_at slightly earlier for realism
    created = now - datetime.timedelta(days=10) 
    return {
        "created_at": created.isoformat(),
        "updated_at": now.isoformat(),
    }

# --- Generate Repositories (2) ---
repo1_ts = generate_timestamps()
repository1 = {
    "id": 1,
    "name": "QuantumLeap UI",
    "url": "https://github.com/mock-org/quantumleap-ui",
    "summary": "Frontend framework for building next-generation user interfaces.",
    "created_at": repo1_ts["created_at"],
    "updated_at": repo1_ts["updated_at"],
}

repo2_ts = generate_timestamps()
repository2 = {
    "id": 2,
    "name": "DataHarvester API",
    "url": "https://github.com/mock-org/dataharvester-api",
    "summary": "High-performance API for collecting and processing real-time data streams.",
    "created_at": repo2_ts["created_at"],
    "updated_at": repo2_ts["updated_at"],
}

# --- Generate Issues (Distributed) ---
# Issues for Repo 1 (QuantumLeap UI)
issue1_ts = generate_timestamps()
issue1 = {
    "id": 1,
    "url": "https://github.com/mock-org/quantumleap-ui/issues/101",
    # "raw_data": {}, # Skipped as requested
    "summary": "Resolved: Component library fails to render correctly in Safari.",
    "created_at": issue1_ts["created_at"],
    "updated_at": issue1_ts["updated_at"],
}
issue2_ts = generate_timestamps()
issue2 = {
    "id": 2,
    "url": "https://github.com/mock-org/quantumleap-ui/issues/105",
    # "raw_data": {}, # Skipped
    "summary": "Resolved: Improve accessibility for screen readers in modal dialogs.",
    "created_at": issue2_ts["created_at"],
    "updated_at": issue2_ts["updated_at"],
}
issue3_ts = generate_timestamps()
issue3 = {
    "id": 3,
    "url": "https://github.com/mock-org/quantumleap-ui/issues/110",
    # "raw_data": {}, # Skipped
    "summary": "Resolved: State management performance degradation with large datasets.",
    "created_at": issue3_ts["created_at"],
    "updated_at": issue3_ts["updated_at"],
}

# Issues for Repo 2 (DataHarvester API)
issue4_ts = generate_timestamps()
issue4 = {
    "id": 4,
    "url": "https://github.com/mock-org/dataharvester-api/issues/55",
    # "raw_data": {}, # Skipped
    "summary": "Resolved: Optimize database connection pooling under heavy load.",
    "created_at": issue4_ts["created_at"],
    "updated_at": issue4_ts["updated_at"],
}
issue5_ts = generate_timestamps()
issue5 = {
    "id": 5,
    "url": "https://github.com/mock-org/dataharvester-api/issues/62",
    # "raw_data": {}, # Skipped
    "summary": "Resolved: Implement rate limiting for public API endpoints.",
    "created_at": issue5_ts["created_at"],
    "updated_at": issue5_ts["updated_at"],
}
issue6_ts = generate_timestamps()
issue6 = {
    "id": 6,
    "url": "https://github.com/mock-org/dataharvester-api/issues/70",
    # "raw_data": {}, # Skipped
    "summary": "Resolved: Add support for Protobuf message format.",
    "created_at": issue6_ts["created_at"],
    "updated_at": issue6_ts["updated_at"],
}

# --- Generate Commits (Distributed) ---
# Commits for Repo 1 (QuantumLeap UI)
commit1_ts = generate_timestamps()
commit1 = {
    "id": 1,
    "url": "https://github.com/mock-org/quantumleap-ui/commit/a1b2c3d4",
    # "raw_data": {}, # Skipped
    "summary": "Fix(Render): Add vendor prefixes for Safari compatibility.",
    "created_at": commit1_ts["created_at"],
    "updated_at": commit1_ts["updated_at"],
}
commit2_ts = generate_timestamps()
commit2 = {
    "id": 2,
    "url": "https://github.com/mock-org/quantumleap-ui/commit/e5f6g7h8",
    # "raw_data": {}, # Skipped
    "summary": "Feat(Accessibility): Add ARIA attributes to modal components.",
    "created_at": commit2_ts["created_at"],
    "updated_at": commit2_ts["updated_at"],
}
commit3_ts = generate_timestamps()
commit3 = {
    "id": 3,
    "url": "https://github.com/mock-org/quantumleap-ui/commit/i9j0k1l2",
    # "raw_data": {}, # Skipped
    "summary": "Refactor(State): Optimize state update propagation logic.",
    "created_at": commit3_ts["created_at"],
    "updated_at": commit3_ts["updated_at"],
}
commit4_ts = generate_timestamps()
commit4 = {
    "id": 4,
    "url": "https://github.com/mock-org/quantumleap-ui/commit/m3n4o5p6",
    # "raw_data": {}, # Skipped
    "summary": "Perf(State): Memoize selectors to prevent unnecessary re-renders.",
    "created_at": commit4_ts["created_at"],
    "updated_at": commit4_ts["updated_at"],
}

# Commits for Repo 2 (DataHarvester API)
commit5_ts = generate_timestamps()
commit5 = {
    "id": 5,
    "url": "https://github.com/mock-org/dataharvester-api/commit/q7r8s9t0",
    # "raw_data": {}, # Skipped
    "summary": "Fix(DB): Adjust pool size and timeout settings.",
    "created_at": commit5_ts["created_at"],
    "updated_at": commit5_ts["updated_at"],
}
commit6_ts = generate_timestamps()
commit6 = {
    "id": 6,
    "url": "https://github.com/mock-org/dataharvester-api/commit/u1v2w3x4",
    # "raw_data": {}, # Skipped
    "summary": "Feat(Security): Add middleware for IP-based rate limiting.",
    "created_at": commit6_ts["created_at"],
    "updated_at": commit6_ts["updated_at"],
}
commit7_ts = generate_timestamps()
commit7 = {
    "id": 7,
    "url": "https://github.com/mock-org/dataharvester-api/commit/y5z6a7b8",
    # "raw_data": {}, # Skipped
    "summary": "Feat(Serialization): Integrate protobuf encoding/decoding.",
    "created_at": commit7_ts["created_at"],
    "updated_at": commit7_ts["updated_at"],
}
commit8_ts = generate_timestamps()
commit8 = {
    "id": 8,
    "url": "https://github.com/mock-org/dataharvester-api/commit/c9d0e1f2",
    # "raw_data": {}, # Skipped
    "summary": "Refactor(Core): Streamline data processing pipeline.",
    "created_at": commit8_ts["created_at"],
    "updated_at": commit8_ts["updated_at"],
}

# --- Generate RepositoryWork (Linking Contributors to Repos, Issues, Commits) ---

# Contributor 1 (Works on Repo 1 & Repo 2)
repo_work1_ts = generate_timestamps()
repository_work1 = {
    "id": 1,
    "repository": repository1["id"], # Link to QuantumLeap UI
    "issues": [issue1, issue3], # Link relevant issues
    "commits": [commit1, commit3, commit4], # Link relevant commits
    "summary": "Fixed rendering bugs and addressed performance issues in state management.",
    "created_at": repo_work1_ts["created_at"],
    "updated_at": repo_work1_ts["updated_at"],
}

repo_work2_ts = generate_timestamps()
repository_work2 = {
    "id": 2,
    "repository": repository2["id"], # Link to DataHarvester API
    "issues": [issue4], # Link relevant issues
    "commits": [commit5, commit8], # Link relevant commits
    "summary": "Optimized database interactions and refactored core processing logic.",
    "created_at": repo_work2_ts["created_at"],
    "updated_at": repo_work2_ts["updated_at"],
}

# Contributor 2 (Works on Repo 1 only)
repo_work3_ts = generate_timestamps()
repository_work3 = {
    "id": 3,
    "repository": repository1["id"], # Link to QuantumLeap UI
    "issues": [issue2], # Link relevant issues
    "commits": [commit2], # Link relevant commits
    "summary": "Improved accessibility features for UI components.",
    "created_at": repo_work3_ts["created_at"],
    "updated_at": repo_work3_ts["updated_at"],
}

# Contributor 3 (Works on Repo 2 only)
repo_work4_ts = generate_timestamps()
repository_work4 = {
    "id": 4,
    "repository": repository2["id"], # Link to DataHarvester API
    "issues": [issue5, issue6], # Link relevant issues
    "commits": [commit6, commit7], # Link relevant commits
    "summary": "Implemented API security measures and added Protobuf support.",
    "created_at": repo_work4_ts["created_at"],
    "updated_at": repo_work4_ts["updated_at"],
}


# --- Generate Contributors (3) ---
contrib1_ts = generate_timestamps()
contributor1 = {
    "id": 1,
    "username": "dev_lead_anna",
    "url": "https://github.com/dev_lead_anna",
    "works": [repository_work1, repository_work2], # Works on both repos
    "summary": "Lead developer focusing on frontend architecture and backend performance.",
    "created_at": contrib1_ts["created_at"],
    "updated_at": contrib1_ts["updated_at"],
}

contrib2_ts = generate_timestamps()
contributor2 = {
    "id": 2,
    "username": "frontend_guru_bob",
    "url": "https://github.com/frontend_guru_bob",
    "works": [repository_work3], # Works only on Repo 1 (QuantumLeap UI)
    "summary": "Frontend specialist with expertise in accessibility and UI frameworks.",
    "created_at": contrib2_ts["created_at"],
    "updated_at": contrib2_ts["updated_at"],
}

contrib3_ts = generate_timestamps()
contributor3 = {
    "id": 3,
    "username": "backend_ninja_carl",
    "url": "https://github.com/backend_ninja_carl",
    "works": [repository_work4], # Works only on Repo 2 (DataHarvester API)
    "summary": "Backend engineer experienced in API design, security, and data formats.",
    "created_at": contrib3_ts["created_at"],
    "updated_at": contrib3_ts["updated_at"],
}

# --- Assemble into DataSerializer structure ---
# Note: The serializers expect nested data directly when read_only=True,
# so we embed the full dictionaries, not just IDs.
# Also adjust RepositoryWork to include the full repo dict if needed by frontend,
# but based on serializer, it expects only the ID. Let's check that.
# RepositoryWorkSerializer has fields = '__all__', but `repository` is a ForeignKey.
# DRF typically serializes FKs as IDs by default. Let's keep it as ID here.
# IssueSerializer and CommitSerializer are embedded fully within RepositoryWorkSerializer.
# RepositoryWorkSerializer is embedded fully within ContributorSerializer.
# DataSerializer shows lists of RepositorySerializer and ContributorSerializer outputs.

# Update RepositoryWork dictionaries to match serializer output structure (issues/commits are lists of dicts)
repository_work1["issues"] = [issue1, issue3]
repository_work1["commits"] = [commit1, commit3, commit4]

repository_work2["issues"] = [issue4]
repository_work2["commits"] = [commit5, commit8]

repository_work3["issues"] = [issue2]
repository_work3["commits"] = [commit2]

repository_work4["issues"] = [issue5, issue6]
repository_work4["commits"] = [commit6, commit7]

# Update Contributor dictionaries to match serializer output structure (works is a list of dicts)
contributor1["works"] = [repository_work1, repository_work2]
contributor2["works"] = [repository_work3]
contributor3["works"] = [repository_work4]


data_serializer_output = {
    "repositories": [
        repository1,
        repository2,
    ],
    "contributors": [
        contributor1,
        contributor2,
        contributor3,
    ]
}

# --- Print the final output (optional, for verification) ---
import json
# print(json.dumps(data_serializer_output, indent=2))

# Final output as a Python dictionary instance
final_data = data_serializer_output

print(json.dumps(final_data, indent=2))