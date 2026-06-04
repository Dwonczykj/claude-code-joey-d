---
name: marp-slide-quality
description: Analyze and improve Marp markdown presentations using SlideGauge. Use when working with Marp slides, presentation files ending in .md with marp frontmatter, or when user asks to check, analyze, improve, or validate slide quality. Requires slidegauge package (installed via uvx).
allowed-tools: Read, Edit, Bash, Grep, Glob, Write
---

# Marp Slide Quality Analyzer

This Skill uses SlideGauge to analyze Marp markdown presentations and help you create high-quality slides that follow best practices.

## Fyxer Branding (Default)

**All presentations use Fyxer branding unless the user explicitly requests different branding.**

Brand assets live at `/Users/joey/Fyxer-Brand-Files/`. The custom Marp theme is at `/Users/joey/Fyxer-Brand-Files/fyxer-theme.css`.

### When creating or rendering a new presentation

Always set frontmatter to use the Fyxer theme:

```yaml
---
marp: true
theme: fyxer
paginate: true
header: "![width:60px](/Users/joey/Fyxer-Brand-Files/fyxer-logo.svg)"
footer: "Fyxer AI"
---
```

If `fyxer-logo.svg` does not exist in the brand files directory, use the repo copy at `app/src/assets/company-logos/fyxer.svg` as the header logo source.

### When rendering with Marp CLI

Always pass the Fyxer theme:

```bash
npx @marp-team/marp-cli --theme /Users/joey/Fyxer-Brand-Files/fyxer-theme.css <presentation.md> --allow-local-files --preview
```

### Brand reference

The Fyxer theme uses these design tokens (from the app's tailwind rebrand palette):

| Token | Value | Usage |
|-------|-------|-------|
| rb-parchment | `#f2f3e8` | Slide background (warm off-white) |
| rb-orange | `#FF5A39` | Primary accent: emphasis, bullet markers, blockquote borders, table headers |
| rb-orange-hovered | `#E34A2B` | Hover/pressed states |
| rb-black | `#000000` | Headings, strong text |
| rb-parchment-light | `#fcfcf5` | Blockquote/table row backgrounds |
| rb-gray-neutral | `#E4E4DC` | Borders, code backgrounds |
| rb-secondary-dark | `#78796C` | Subtitle text, h3 |
| rb-disabled | `#A1A297` | Footer, pagination |
| rb-green | `#b1e731` | Accent (use sparingly) |

**Fonts**: Poppins (headings), DM Sans (body)

**Slide classes available**:
- Default: parchment background, black text
- `<!-- _class: lead -->`: centered title/closing slides
- `<!-- _class: invert -->`: dark background (black), parchment text
- `<!-- _class: orange -->`: orange background, white text

### When NOT to use Fyxer branding

Only skip Fyxer branding if the user explicitly says to use different branding (e.g. "use plain theme", "no branding", "use uncover theme").

## When to use this Skill

- User is working on a Marp presentation (`.md` file with `marp: true` frontmatter)
- User asks to check, analyze, validate, or improve slide quality
- User mentions SlideGauge or slide quality issues
- User wants to fix specific slide problems (too many bullets, long content, etc.)

## Instructions

### 1. Initial Analysis

When user asks to analyze their slides:

```bash
# Run SlideGauge with text output for quick overview
uvx --from git+https://github.com/nibzard/slidegauge slidegauge <path-to-presentation.md> --text
```

**Explain the results:**
- Overall score and passing rate
- Number of issues found
- Category breakdown (a11y, code, color, content, layout)

### 2. Detailed Analysis

For slides that need fixing (score < 80):

```bash
# Get JSON output with detailed diagnostics
uvx --from git+https://github.com/nibzard/slidegauge slidegauge <path-to-presentation.md> --json | jq '.slides[] | select(.score < 80)'
```

**For each failing slide, identify:**
- Exact slide number and title
- Specific issues with deduction amounts
- Actionable recommendations

### 3. Fix Common Issues

Use the Edit tool to fix issues. See [FIXES.md](FIXES.md) for specific fix patterns.

**Common fixes:**

- **Too many bullets**: Split into multiple slides or consolidate
- **Content too long**: Trim text or split slide
- **Code too long**: Simplify examples or split
- **Too many lines**: Reduce content density
- **Title too long**: Shorten to ≤35 characters

### 4. Validate Fixes

After making changes, re-run SlideGauge:

```bash
uvx --from git+https://github.com/nibzard/slidegauge slidegauge <path-to-presentation.md> --text
```

Compare before/after scores and confirm improvements.

## Workflow

1. **Analyze**: Run SlideGauge to get baseline scores
2. **Prioritize**: Focus on slides scoring < 70 first, then < 80
3. **Fix**: Apply fixes from FIXES.md based on diagnostics
4. **Validate**: Re-run to confirm improvements
5. **Iterate**: Repeat until all slides pass (≥70) or user is satisfied

## Key Thresholds

- **70**: Minimum passing score (slides below this MUST be fixed)
- **80**: Good quality (recommend fixing these)
- **90+**: Excellent quality
- **100**: Perfect score

## Category Scores

- **a11y**: Accessibility (alt text, contrast)
- **code**: Code block length and complexity
- **color**: Color usage and contrast ratios
- **content**: Text length, bullets, line count
- **layout**: Overall slide structure

## Best Practices

1. **Always show user the results** - don't just fix silently
2. **Explain WHY** each fix improves the slide
3. **Get user approval** before making major changes (splitting slides, removing content)
4. **Preserve user intent** - don't change technical content
5. **Re-validate after fixes** to show improvement

## Examples

See [EXAMPLES.md](EXAMPLES.md) for detailed examples of:
- Analyzing a full presentation
- Fixing specific slide issues
- Splitting overloaded slides
- Optimizing code examples

## Reference

See [REFERENCE.md](REFERENCE.md) for complete SlideGauge rule documentation.

## Dependencies

SlideGauge is installed via uvx on-demand:
```bash
uvx --from git+https://github.com/nibzard/slidegauge slidegauge --help
```

No manual installation required - uvx handles it automatically.