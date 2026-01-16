# Skill: Admin Console (Users, Companies, Clusters, Assignments, Audit)

## Goal

Build ADMIN tooling for all master data.

## GraphQL operations

Users:

- adminUsers(filter)
- createUser(input: {entraOid,email,displayName})
- setUserActive(userId, active)
- setUserRoles(userId, roles[])
- setCompanyAssignments(userId, assignments[])

Companies:

- adminCompanies(filter)
- createCompany(input)
- updateCompany(id, input)
- toggleCompanyActive(id, active)

Clusters:

- adminClusters()
- createCluster(name)
- updateCluster(id, name, active)

Audit logs:

- auditLogs(filter)

## Acceptance checks

- Admin can add FO/FD and assign companies
- Unassigned users cannot access app
- Company activation affects availability in drafts
