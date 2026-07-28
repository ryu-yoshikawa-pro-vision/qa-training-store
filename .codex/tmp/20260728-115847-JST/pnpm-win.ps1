param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $CommandArguments
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath "C:\Users\sella\Documents\qa-training-store"
& "$env:APPDATA\npm\pnpm.cmd" @CommandArguments
exit $LASTEXITCODE
