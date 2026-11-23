# Temporary Mermaid CSS probe

Checks whether GitHub's Mermaid renderer keeps custom CSS, and whether `:hover`
works inside it. Delete this directory once answered.

## 1. Control: themeVariables through an init directive

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#ff00ff"}}}%%
flowchart LR
  c1[control] --> c2[magenta if directives work]
```

## 2. themeCSS through an init directive

```mermaid
%%{init: {"themeCSS": ".node rect{fill:#0d1117 !important;stroke:#51c7da !important;transition:fill 1.2s ease-out} .node:hover rect{fill:#e3cf65 !important;transition:none} .node .nodeLabel{color:#76c5a4 !important}"}}%%
flowchart LR
  a1[hover me] --> a2[and me]
```

## 3. themeCSS through frontmatter config

```mermaid
---
config:
  themeCSS: ".node rect{fill:#111820 !important;stroke:#fb7da7 !important;transition:fill 1.2s ease-out} .node:hover rect{fill:#fdad5d !important;transition:none}"
---
flowchart LR
  b1[hover me] --> b2[and me]
```

## 4. Keyframe animation through themeCSS (no hover needed)

```mermaid
%%{init: {"themeCSS": "@keyframes probepulse{from{opacity:1}to{opacity:.2}} .node rect{animation:probepulse 1s infinite alternate}"}}%%
flowchart LR
  k1[pulses if keyframes survive]
```

## 5. Star trail grid (block diagram)

```mermaid
%%{init: {"themeCSS": ".block rect, .node rect{fill:#0d1117 !important;stroke:#0d1117 !important;transition:fill 1.5s ease-out} .node:hover rect{fill:#e3cf65 !important;transition:none}"}}%%
block-beta
  columns 8
  s1[" "] s2[" "] s3[" "] s4[" "] s5[" "] s6[" "] s7[" "] s8[" "]
  s9[" "] s10[" "] s11[" "] s12[" "] s13[" "] s14[" "] s15[" "] s16[" "]
  s17[" "] s18[" "] s19[" "] s20[" "] s21[" "] s22[" "] s23[" "] s24[" "]
```
