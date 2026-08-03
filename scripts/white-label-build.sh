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

rm -rf public/funnel src/app/affilirank src/app/funnel

npx next build
