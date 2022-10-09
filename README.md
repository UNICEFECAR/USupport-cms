# Welcome

Main repository for the USupport Headless CMS

## Usage

To clone the source code use:

```
git clone git@github.com:UNICEFECAR/USupport-cms.git
```

To install all the dependencies use:

```
npm install
```

To run the project locally:

```
npm run develop
```

To run the project using docker:

```
docker build -t usupportcms:latest .
```

```
docker-compose up -d
```

## Please follow these naming conventions for your branches

- Features `feature/{JIRA_ID}-{branch_name}
- Bugs `bug/{JIRA_ID}-{branch_name}
- Hotfixes `hotfix/{JIRA_ID}-{branch_name}

## Guidelines for writing a commit message when committing changes to the USupport Components Library

- Create: `[commit message]` (create a new component)
- Add: `[commit message]` (addition to an existing component)
- Fix: `[commit message]` (fix a bug within an existing component)
- Refactor: `[commit message]` (refactor an existing component)
