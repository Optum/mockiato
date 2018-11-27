[![Build Status](https://travis-ci.org/Optum/mockiato.svg?branch=master)](https://travis-ci.org/Optum/mockiato) [![DeepScan grade](https://deepscan.io/api/projects/2971/branches/22804/badge/grade.svg)](https://deepscan.io/dashboard#view=project&pid=2971&bid=22804)

# Mockiato: A web-based platform for API virtualization 
 
## Quick Start 

1. Clone this repo: `git clone https://github.com/Optum/mockiato.git && cd mockiato`
2. Set secret for JWT: `echo MOCKIATO_SECRET="<REPLACE>" > .env`
3. Start Mockiato & MongoDB: `docker-compose up`
4. View the app at http://localhost:8080 or the API documentation at http://localhost:8080/api-docs

This quick-start makes some basic assumptions on how you want to run the application. For other possible configurations, please see the next section.

## Configuration

Mockiato can be configured with the following environment variables. These can be set globally or in a file called `.env` in the project root directory. 

| Option | Example | Description |
| ------ | ------------- | ----------- |
| MOCKIATO_SECRET | | Required. Used to sign and verify JSON Web Tokens |
| MOCKIATO_AUTH | local | The auth strategy to use. Defaults to "local" |
| MONGODB_HOST | localhost | The hostname for your Mongo instance |
| MONGODB_USER | admin | The user to connect to Mongo with |
| MONGODB_PASSWORD | | The password for the Mongo user |


## What is it?

Mockiato is a web-based platform for API virtualization. Mockiato was developed at Optum to enable test automation, and can simulate REST APIs, SOAP services, and message-oriented middleware.

Mockiato can generate realistic data for testing, and export it to JSON, XML, or CSV. Mockiato creates virtual endpoints that simulate your production APIs. These virtual services are ideal for testing, sandboxing, knowledge transfer, and driving rapid development.

Mockiato is built on open-source technologies like Node.js and MongoDB, and was designed API-first with cloud readiness in mind. It exposes a RESTful API to programmatically interact with your services, as well as a modern web interface and command-line client.

## Architecture

Mockiato is comprised of 3 basic architectural components: a web-based user interface, a REST API for managing services, and a Mongo database.

#### Web UI

Mockiato provides a simple, intuitive interface for managing virtual services. Built on AngularJS, this single-page application acts as a client to a Mockiato server.

#### REST API

In Mockiato, virtual services are considered resources. A REST API is exposed to facilitate CRUD (create, read, update, delete) operations on these resources.

For more information on the methods available in the API, please see our Swagger documentation.

#### NoSQL

All of the data that comprises a virtual service (base path, request data, response data, etc.) is stored in a Mongo database. 

Please see the next section for more information on the data models behind Mockiato.

## Data Models

Mockiato structures data according to 4 basic models: a service, a request / response pair, a group, and an owner.

#### Service

The service model is the primary entity, and the remaining 3 are sub-components of it. The service is comprised of a base path, type (e.g. SOAP, REST), name, owner, group, and a set of request / response pairs.

#### RR Pair

A request / response pair holds all information necessary for request matching (headers, status codes, HTTP methods, relative paths, request bodies, response bodies, etc.) At least one RR pair should be associated with a service for matching to occur, but many can run on a single service. For example, one service running on base path /v2/pets could have 2 RR pairs: one for creating a pet (e.g. a POST with some request data), and one for retrieving the pet (e.g. a GET with the pet ID as relative path).

#### Group (SUT)

Formerly known as a "system under test", a group is a convenient way to organize services. Think of it like a tag; it's just a way to say "these services belong together". It has only 2 fields: a generated ID and a name. The name is prepended to the base path of your virtual service. For example, a service with basepath /v2/pets in the group "test" will run in Mockiato on the base path /virtual/test/v2/pets.

#### Owner

The service owner is the person who created the service. If Mockiato is running with the LDAP authentication strategy, then the non-ID fields for the owner model are simply a username and email address. These are pulled from AD automatically on your first login.

