# Project TODO

- [x] Add site, agent, Defender status, Quarantine, inspection command, RDP session, and audit log data models
- [x] Add database migration and apply the schema to the managed database
- [x] Add admin-only tRPC procedures for agent registration tokens, agent inventory, dashboard summaries, Quarantine records, inspection commands, Guacamole tokens, and audit logs
- [x] Add agent heartbeat ingestion and online/offline status calculation
- [x] Add safe command lifecycle tracking for Full Scan, Quick Scan, and 서명 업데이트
- [x] Build elegant security operations dashboard with site filtering and summary cards
- [x] Build agent inventory and agent detail views
- [x] Build Quarantine view with threat details and timestamps
- [x] Build command execution and status tracking UI
- [x] Build Apache Guacamole connection-token flow UI with short-lived one-time token messaging
- [x] Build RDP session audit log view
- [x] Enforce admin-only access across security operations routes and procedures
- [x] Add Vitest coverage for authorization, dashboard aggregation, command creation, and token issuance
- [x] Run type checking, tests, production build, and visual preview verification
- [x] Save the completed project checkpoint

- [x] Connect the deployed Apache Guacamole/guacd endpoint through a production `GUACAMOLE_BASE_URL` secret

## History

- [x] Initial implementation scope captured from the user's Security Agent Platform requirements

- [ ] Push the latest complete project commit to the user's external public GitHub repository and verify that source files are visible
