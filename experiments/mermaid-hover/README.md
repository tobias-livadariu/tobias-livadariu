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

## 6. Repository SVG as the diagram background, hover grid on top

```mermaid
%%{init: {"themeCSS": "&{background:url(https://raw.githubusercontent.com/tobias-livadariu/tobias-livadariu/tliv/drastic-readme-changes/assets/profile-terminal.v15.still.svg) no-repeat center top/100% auto} .node rect{fill:transparent !important;stroke:transparent !important;transition:fill 1.5s ease-out} .node:hover rect{fill:#e3cf65 !important;transition:none}"}}%%
block-beta
  columns 8
  t1[" "] t2[" "] t3[" "] t4[" "] t5[" "] t6[" "] t7[" "] t8[" "]
  t9[" "] t10[" "] t11[" "] t12[" "] t13[" "] t14[" "] t15[" "] t16[" "]
```

## 7. Same background through a plain svg selector

```mermaid
%%{init: {"themeCSS": "svg{background:url(https://raw.githubusercontent.com/tobias-livadariu/tobias-livadariu/tliv/drastic-readme-changes/assets/profile-terminal.v15.still.svg) no-repeat center top/100% auto} .node rect{fill:transparent !important;stroke:transparent !important}"}}%%
block-beta
  columns 4
  u1[" "] u2[" "] u3[" "] u4[" "]
```
