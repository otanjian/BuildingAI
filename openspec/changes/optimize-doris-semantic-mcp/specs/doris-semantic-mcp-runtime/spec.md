## Purpose

This capability makes Doris MCP semantic discovery usable for enterprise analysis by publishing SAP metadata, loading validated Ossie models, and binding those models to read-only Doris tables and views.

## ADDED Requirements

### Requirement: Publish readable SAP metadata

The Doris deployment SHALL expose the SAP metadata tables and MCP views in `sap_meta`, and the configured MCP database principal SHALL have read-only access to them.

#### Scenario: Metadata view is available

- **WHEN** the MCP principal queries an `sap_meta.v_mcp_*` view
- **THEN** Doris returns the published metadata rows without requiring write or administrative privileges

#### Scenario: Metadata is empty or inaccessible

- **WHEN** a required metadata view is missing or the MCP principal cannot read it
- **THEN** readiness verification fails with the exact missing object or privilege instead of reporting semantic capability as ready

### Requirement: Load bounded Ossie models

The Doris MCP server SHALL load only local, validated Ossie model files referenced by an explicit binding manifest, and each dataset binding SHALL point to an existing read-only Doris table or view.

#### Scenario: Valid model is loaded

- **WHEN** the server starts with a valid model directory and binding manifest
- **THEN** `doris_semantic` reports the model as available with its model reference, binding identity, datasets, and metrics

#### Scenario: Invalid model is rejected

- **WHEN** a model file, binding, schema, or physical object is invalid
- **THEN** the server rejects that model with a deterministic configuration error and keeps semantic calls unavailable

### Requirement: Preserve least privilege and unsupported states

The Doris MCP deployment SHALL keep semantic access read-only, SHALL leave MetricFlow and ADBC disabled unless separately configured, and SHALL continue reporting Doris-version-gated or privilege-gated capabilities as unavailable.

#### Scenario: Read-only semantic query

- **WHEN** a caller requests semantic context or a validated semantic query
- **THEN** the server reads only the bound Doris objects and does not permit DDL or DML through the semantic provider

#### Scenario: Optional provider is disabled

- **WHEN** MetricFlow or ADBC is not configured
- **THEN** their child capabilities remain explicitly unavailable without affecting Ossie or ordinary read-only query capabilities
