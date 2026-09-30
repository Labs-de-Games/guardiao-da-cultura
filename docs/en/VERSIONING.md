🌐 English | [Português (Brasil)](../pt-BR/VERSIONING.md)

# **Release Process Guidelines and Structure — Guardião da Cultura**

This document establishes the official standard for managing, planning, and executing releases of Guardião da Cultura, ensuring production environment stability and delivery predictability.

## **1. Release Windows (Days and Times)**

To mitigate risk and guarantee support team availability, production releases must strictly follow the schedule below:

| Release Type | Allowed Days | Time Limit | Expected Impact |
| :---- | :---- | :---- | :---- |
| **Ordinary Release (Minor/Patch)** | Monday | 1pm–3pm | Low / Transparent |
|  | Tuesday | 1pm–7pm |  |
|  | Thursday | 1pm–7pm |  |
| **New Version (Major)** | Thursday | 1pm–3pm | Medium to High (Scheduled downtime) |
| **Emergency (Hotfix)** | Any day (Subject to approval) | Immediately after validation, avoid end of day | Critical (Blocking bug fix) |

*Note: Ordinary deploys are strictly prohibited on Fridays, the day before holidays, or periods of high public engagement, such as public announcement dates.*

## **2. Naming and Versioning**

We adopt the **Semantic Versioning (SemVer)** standard in the *MAJOR.MINOR.PATCH* format:

* **MAJOR:** Incremented when there are backward-incompatible changes (breaking changes).
* **MINOR:** Incremented when new features are added in a backward-compatible way.
* **PATCH:** Incremented when backward-compatible bug fixes are applied.

### **Branch and Git Tag Naming**

The code branching structure must follow the flow below:

* **master:** always reflects the code currently in production
* **develop:** the most up-to-date, complete version of the code, still under validation
* **release/vX.Y.Z:** preparation branch for a release, created from `develop`
* **hotfix/vX.Y.Z:** branch for urgent production fixes

**Tags:** Every successful release must generate an immutable semantic tag (e.g., v1.4.2).

## **3. Staging and Production Environments**

Production example: v1.0.0 -> Version 1.0.0 with the following features:

* Full description of the changes included in the version.

Staging is not versioned with tags: every push to `develop` is deployed to staging by `cd-staging.yml`.

### **Version and Deployment History**

See [docs/CHANGELOG.md](../CHANGELOG.md) for the full per-version changelog. Maintainers deploy to production through the production CD workflow (`cd-production.yml`), so each production deploy is a run of that workflow in the repository's Actions tab.

## **4. Step-by-Step Execution Process**

The process is divided into three mandatory stages:

1. **Pre-Release:**
   * Ensure all tests and changes have been approved in the CI pipeline.
   * Generate the Changelog with the list of features and fixes included.
   * Freeze new changes (Code Freeze) on the release branch.
2. **Execution (Deploy):**
   * Perform a preventive backup of the database and application state.
   * Trigger the CD pipeline for the production environment.
   * Monitor logs in real time during the cutover.
3. **Post-Release (Sanity Check):**
   * Run tests on the main game mechanics and user journeys.
   * Validate performance and infrastructure metrics (CPU, Memory, Errors).

## **5. Rollback Plan (Version Reversion)**

If a release presents unsustainable instability during the Post-Release stage, the following activation criteria and rollback steps must be triggered immediately:

### **Activation Criteria**

* Total system unavailability with no quick diagnosis.
* Critical failure in an important flow or core business function.
* Error rate above 5% on global requests after the deploy.

### **Rollback Procedure**

1. **Step 1:** Return production to the previous stable version. `cd-production.yml` takes no inputs: it builds the current `master` commit, publishes the images as `master-<short-sha>` and `master`, and triggers the production deploy. To roll back, revert the faulty change on `master` through a `hotfix/vX.Y.Z` pull request and run `cd-production.yml` again. The images of earlier production builds stay in the container registry as `master-<short-sha>`; the tag of the previous release identifies the commit, and so the image, to return to.
2. **Step 2:** If there was a database schema change (migrations), apply the corresponding reversion script, ensuring the integrity of data inserted during the interval.
3. **Step 3:** Notify the team and stakeholders about the return to the previous version.
4. **Step 4:** Open a Post-Mortem session within 24 hours to analyze the root cause of the failure.
