# Lighthouse agent skills

**Usage skill** — teaches coding agents how to *use* Lighthouse (briefs, topics, WebMCP), not how to develop the repository.

```bash
npx skills add guglxni/lighthouse-kestra --skill lighthouse -y
```

Multi-agent:

```bash
npx skills add guglxni/lighthouse-kestra --skill lighthouse \
  -a claude-code -a cursor -a codex -a gemini-cli -y
```

Local checkout:

```bash
npx skills add ./skills/lighthouse --copy -a cursor -y
```

## Skills

| Skill | Audience | Description |
|-------|----------|-------------|
| [lighthouse](lighthouse/SKILL.md) | End users & agents operating the product | BYOK briefs, topics, WebMCP connection, delivery setup |

Connect agents via [WebMCP](https://github.com/webmachinelearning/webmcp) on https://demo-beta-topaz.vercel.app/dashboard when signed in.
