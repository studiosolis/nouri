#!/usr/bin/env python3
# Run this to generate icon PNGs if you have PIL installed
# Otherwise the manifest will just show no icon, which is fine

icon_svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="40" fill="#6C63FF"/>
  <text x="96" y="130" text-anchor="middle" font-size="100">🥗</text>
</svg>'''

with open("public/icon.svg", "w") as f:
    f.write(icon_svg)

print("icon.svg written to public/")
