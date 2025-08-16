export const mockData = {
  "repositories": [
    {
      "id": 1,
      "name": "QuantumLeap UI",
      "url": "https://github.com/mock-org/quantumleap-ui",
      "summary": "Frontend framework for building next-generation user interfaces.",
      "created_at": "2025-04-24T00:16:43.802567+00:00",
      "updated_at": "2025-05-04T00:16:43.802567+00:00"
    },
    {
      "id": 2,
      "name": "DataHarvester API",
      "url": "https://github.com/mock-org/dataharvester-api",
      "summary": "High-performance API for collecting and processing real-time data streams.",
      "created_at": "2025-04-24T00:16:43.802919+00:00",
      "updated_at": "2025-05-04T00:16:43.802919+00:00"
    }
  ],
  "contributors": [
    {
      "id": 1,
      "username": "dev_lead_anna",
      "url": "https://github.com/dev_lead_anna",
      "avatar_url": "https://avatars.githubusercontent.com/u/12345678?v=4",
      "works": [
        {
          "id": 1,
          "repository": 1,
          "issues": [
            {
              "id": 1,
              "url": "https://github.com/mock-org/quantumleap-ui/issues/101",
              "summary": "Resolved: Component library fails to render correctly in Safari.",
              "created_at": "2025-04-24T00:16:43.802922+00:00",
              "updated_at": "2025-05-04T00:16:43.802922+00:00"
            },
            {
              "id": 3,
              "url": "https://github.com/mock-org/quantumleap-ui/issues/110",
              "summary": "Resolved: State management performance degradation with large datasets.",
              "created_at": "2025-04-24T00:16:43.802928+00:00",
              "updated_at": "2025-05-04T00:16:43.802928+00:00"
            }
          ],
          "commits": [
            {
              "id": 1,
              "url": "https://github.com/mock-org/quantumleap-ui/commit/a1b2c3d4",
              "summary": "Fix(Render): Add vendor prefixes for Safari compatibility.",
              "created_at": "2025-04-24T00:16:43.802939+00:00",
              "updated_at": "2025-05-04T00:16:43.802939+00:00"
            },
            {
              "id": 3,
              "url": "https://github.com/mock-org/quantumleap-ui/commit/i9j0k1l2",
              "summary": "Refactor(State): Optimize state update propagation logic.",
              "created_at": "2025-04-24T00:16:43.802944+00:00",
              "updated_at": "2025-05-04T00:16:43.802944+00:00"
            },
            {
              "id": 4,
              "url": "https://github.com/mock-org/quantumleap-ui/commit/m3n4o5p6",
              "summary": "Perf(State): Memoize selectors to prevent unnecessary re-renders.",
              "created_at": "2025-04-24T00:16:43.802946+00:00",
              "updated_at": "2025-05-04T00:16:43.802946+00:00"
            }
          ],
          "summary": "Fixed rendering bugs and addressed performance issues in state management.",
          "created_at": "2025-04-24T00:16:43.802959+00:00",
          "updated_at": "2025-05-04T00:16:43.802959+00:00"
        },
        {
          "id": 2,
          "repository": 2,
          "issues": [
            {
              "id": 4,
              "url": "https://github.com/mock-org/dataharvester-api/issues/55",
              "summary": "Resolved: Optimize database connection pooling under heavy load.",
              "created_at": "2025-04-24T00:16:43.802930+00:00",
              "updated_at": "2025-05-04T00:16:43.802930+00:00"
            }
          ],
          "commits": [
            {
              "id": 5,
              "url": "https://github.com/mock-org/dataharvester-api/commit/q7r8s9t0",
              "summary": "Fix(DB): Adjust pool size and timeout settings.",
              "created_at": "2025-04-24T00:16:43.802949+00:00",
              "updated_at": "2025-05-04T00:16:43.802949+00:00"
            },
            {
              "id": 8,
              "url": "https://github.com/mock-org/dataharvester-api/commit/c9d0e1f2",
              "summary": "Refactor(Core): Streamline data processing pipeline.",
              "created_at": "2025-04-24T00:16:43.802956+00:00",
              "updated_at": "2025-05-04T00:16:43.802956+00:00"
            }
          ],
          "summary": "Optimized database interactions and refactored core processing logic.",
          "created_at": "2025-04-24T00:16:43.802962+00:00",
          "updated_at": "2025-05-04T00:16:43.802962+00:00"
        }
      ],
      "summary": "Lead developer focusing on frontend architecture and backend performance.",
      "created_at": "2025-04-24T00:16:43.802969+00:00",
      "updated_at": "2025-05-04T00:16:43.802969+00:00"
    },
    {
      "id": 2,
      "username": "frontend_guru_bob",
      "url": "https://github.com/frontend_guru_bob",
      "avatar_url" : "https://avatars.githubusercontent.com/u/87654321?v=4",
      "works": [
        {
          "id": 3,
          "repository": 1,
          "issues": [
            {
              "id": 2,
              "url": "https://github.com/mock-org/quantumleap-ui/issues/105",
              "summary": "Resolved: Improve accessibility for screen readers in modal dialogs.",
              "created_at": "2025-04-24T00:16:43.802925+00:00",
              "updated_at": "2025-05-04T00:16:43.802925+00:00"
            }
          ],
          "commits": [
            {
              "id": 2,
              "url": "https://github.com/mock-org/quantumleap-ui/commit/e5f6g7h8",
              "summary": "Feat(Accessibility): Add ARIA attributes to modal components.",
              "created_at": "2025-04-24T00:16:43.802942+00:00",
              "updated_at": "2025-05-04T00:16:43.802942+00:00"
            }
          ],
          "summary": "Improved accessibility features for UI components.",
          "created_at": "2025-04-24T00:16:43.802964+00:00",
          "updated_at": "2025-05-04T00:16:43.802964+00:00"
        }
      ],
      "summary": "Frontend specialist with expertise in accessibility and UI frameworks.",
      "created_at": "2025-04-24T00:16:43.802972+00:00",
      "updated_at": "2025-05-04T00:16:43.802972+00:00"
    },
    {
      "id": 3,
      "username": "backend_ninja_carl",
      "url": "https://github.com/backend_ninja_carl",
      "avatar_url": "https://avatars.githubusercontent.com/u/11223344?v=4",
      "works": [
        {
          "id": 4,
          "repository": 2,
          "issues": [
            {
              "id": 5,
              "url": "https://github.com/mock-org/dataharvester-api/issues/62",
              "summary": "Resolved: Implement rate limiting for public API endpoints.",
              "created_at": "2025-04-24T00:16:43.802933+00:00",
              "updated_at": "2025-05-04T00:16:43.802933+00:00"
            },
            {
              "id": 6,
              "url": "https://github.com/mock-org/dataharvester-api/issues/70",
              "summary": "Resolved: Add support for Protobuf message format.",
              "created_at": "2025-04-24T00:16:43.802936+00:00",
              "updated_at": "2025-05-04T00:16:43.802936+00:00"
            }
          ],
          "commits": [
            {
              "id": 6,
              "url": "https://github.com/mock-org/dataharvester-api/commit/u1v2w3x4",
              "summary": "Feat(Security): Add middleware for IP-based rate limiting.",
              "created_at": "2025-04-24T00:16:43.802951+00:00",
              "updated_at": "2025-05-04T00:16:43.802951+00:00"
            },
            {
              "id": 7,
              "url": "https://github.com/mock-org/dataharvester-api/commit/y5z6a7b8",
              "summary": "Feat(Serialization): Integrate protobuf encoding/decoding.",
              "created_at": "2025-04-24T00:16:43.802953+00:00",
              "updated_at": "2025-05-04T00:16:43.802953+00:00"
            }
          ],
          "summary": "Implemented API security measures and added Protobuf support.",
          "created_at": "2025-04-24T00:16:43.802967+00:00",
          "updated_at": "2025-05-04T00:16:43.802967+00:00"
        }
      ],
      "summary": "Backend engineer experienced in API design, security, and data formats.",
      "created_at": "2025-04-24T00:16:43.802975+00:00",
      "updated_at": "2025-05-04T00:16:43.802975+00:00"
    }
  ]
}
