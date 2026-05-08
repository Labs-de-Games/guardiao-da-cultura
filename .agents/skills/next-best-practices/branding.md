# Branding & Design System

This document defines the visual identity and color palette for the project.

## Typography

### Google Fonts

The project uses two typefaces from Google Fonts:

#### Jockey One
- **Use for**: Titles, section headers, highlighted text, and prominent UI elements that need visual emphasis
- **Weight**: Regular (400)
- **Import**: Included via `layout.tsx` with `family=Jockey+One`
- **Examples**: Page titles, level names, achievement badges, menu titles

#### Inter
- **Use for**: Body text, descriptions, normal UI labels, form inputs, and all regular content
- **Weight**: 400 (regular), 500 (medium), 700 (bold)
- **Import**: Included via `layout.tsx` with `family=Inter:wght@400;500;700`
- **Examples**: Narrative text, instructions, player feedback, scores, inventory labels

### Font Usage Guidelines

1. **Always choose the appropriate font first**—Jockey One for emphasis, Inter for everything else
2. **Never mix fonts arbitrarily**—maintain consistency across similar UI elements
3. **Respect hierarchy**: Use font size, weight, and color together to create visual priority
4. **Accessibility**: Maintain contrast ratios per WCAG 2.1 AA (4.5:1 for body text)

---

## Color Palette

The project's official color palette consists of carefully selected greens, yellows, blues, reds, and neutral tones.

### Greens

Used for progress, success, and positive feedback.

| Hex | RGB | Usage |
|-----|-----|-------|
| `#165925` | 22, 89, 37 | Dark green accents, deep backgrounds |
| `#216831` | 33, 104, 49 | Forest green, secondary highlights |
| `#3B8C45` | 59, 140, 69 | Bright green, primary action, success states |
| `#5EB669` | 94, 182, 105 | Light green, hover states, secondary action |

### Yellows

Used for highlights, warnings, and cultural emphasis (e.g., titles).

| Hex | RGB | Usage |
|-----|-----|-------|
| `#AF7E2F` | 175, 126, 47 | Dark gold, rich accents |
| `#D9AD56` | 217, 173, 86 | Bright gold, titles and highlights (primary yellow) |
| `#F1CD77` | 241, 205, 119 | Light gold, secondary highlights |
| `#F4EEDE` | 244, 238, 222 | Pale cream, text backgrounds |

### Blues

Used for information, links, and secondary interactions.

| Hex | RGB | Usage |
|-----|-----|-------|
| `#035378` | 3, 83, 120 | Dark navy, deep backgrounds |
| `#3088B9` | 48, 136, 185 | Bright blue, links and info |
| `#65C0F4` | 101, 192, 244 | Sky blue, hover states |

### Reds

Used for errors, warnings, and destructive actions.

| Hex | RGB | Usage |
|-----|-----|-------|
| `#A84528` | 168, 69, 40 | Dark red, errors and warnings |
| `#D17155` | 209, 113, 85 | Medium red, alert highlights |
| `#DE9D8A` | 222, 157, 138 | Light red, error backgrounds |

### Neutrals (Black to White)

Used for text, borders, and structural elements.

| Hex | RGB | Usage |
|-----|-----|-------|
| `#252726` | 37, 39, 38 | Near-black, primary text, dark backgrounds |
| `#F5F5F5` | 245, 245, 245 | Off-white, light text backgrounds, card backgrounds |
| `#FFFFFF` | 255, 255, 255 | Pure white, contrast, interactive elements |

### Color Usage Guidelines

1. **Establish hierarchy** using color intensity: dark colors for primary elements, lighter tints for secondary
2. **Test contrast**: Ensure text colors meet WCAG 2.1 AA standards (4.5:1 for body)
3. **Avoid pure grays**—use the neutral palette with slight warmth (#252726 instead of #333333)
4. **Reserve bright colors** (yellows, blues) for interactive states and feedback
5. **Use reds sparingly** and only for errors, warnings, or destructive actions
6. **Greens signal success, progress, and positive interactions**

---

## Implementation

### React & Next.js

Define colors in CSS variables for easy maintenance:

```css
:root {
  --color-green-dark: #165925;
  --color-green-primary: #3B8C45;
  --color-yellow-primary: #D9AD56;
  --color-red-error: #A84528;
  --color-neutral-dark: #252726;
  --color-neutral-light: #F5F5F5;
}
```

Use in components:

```jsx
<h1 style={{ fontFamily: "Jockey One", color: "var(--color-yellow-primary)" }}>
  Game Title
</h1>
<p style={{ fontFamily: "Inter", color: "var(--color-neutral-dark)" }}>
  Regular text content
</p>
```

### Phaser

Use hex color codes directly:

```javascript
const titleText = this.add.text(x, y, "Title", {
  fontFamily: "Jockey One",
  fontSize: "32px",
  color: "#D9AD56", // Bright gold
});

const bodyText = this.add.text(x, y, "Content", {
  fontFamily: "Inter",
  fontSize: "16px",
  color: "#252726", // Near-black
});
```

---

## Accessibility

- **Contrast**: Always maintain at least 4.5:1 contrast ratio for text on backgrounds
- **Color alone**: Never use color as the only indicator of state; combine with text or icons
- **High contrast mode**: Test designs in forced-colors mode
- **Color blindness**: Avoid red-green combinations without additional differentiation

---

## Future Maintenance

If the palette needs to be extended:
1. Request approval before adding new colors
2. Document the new color's hex code, RGB values, and intended usage
3. Update this guide and ensure all team members are notified
4. Test accessibility standards for all new color combinations
