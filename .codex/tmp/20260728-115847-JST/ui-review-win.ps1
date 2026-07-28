param(
  [Parameter(Mandatory = $true)]
  [string] $Stage,
  [Parameter(Mandatory = $true)]
  [string] $Project,
  [string] $Routes = ""
)

$ErrorActionPreference = "Stop"
$env:UI_REVIEW_STAGE = $Stage
if ($Routes -ne "") {
  $env:UI_REVIEW_ROUTES = $Routes
} else {
  Remove-Item Env:UI_REVIEW_ROUTES -ErrorAction SilentlyContinue
}
Set-Location -LiteralPath "C:\Users\sella\Documents\qa-training-store"
& "$env:APPDATA\npm\pnpm.cmd" exec playwright test e2e/web/ui-review.spec.ts "--project=$Project" --workers=1
exit $LASTEXITCODE
