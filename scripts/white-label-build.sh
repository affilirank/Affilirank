#!/usr/bin/env bash
# White-label build (lifetimedealsbundle.com)
#
# Produces a deployment with ZERO AffiliRank/affilirank.com surface area:
#  - removes the AffiliRank sales funnel (public/funnel/*)
#  - removes the AffiliRank product page (/affilirank) and funnel redirect (/funnel)
#
# Everything else (name, tagline, tag, product-page gating, sitemap) is driven
# by NEXT_PUBLIC_* env vars at build time — see src/lib/constants.ts.
set -euo pipefail

echo "> White-label build: stripping AffiliRank-only surfaces"
for target in public/funnel src/app/affilirank src/app/funnel; do
  if [ -d "$target" ]; then
    rm -rf "$target"
    echo "  removed $target"
  fi
done

echo "> Building (NEXT_PUBLIC_SHOW_PRODUCT_PAGE=${NEXT_PUBLIC_SHOW_PRODUCT_PAGE:-unset})"
npx next build
