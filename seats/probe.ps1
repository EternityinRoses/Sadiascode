$v = Get-Content 'D:\Sadias Canvas\src\world\void.js'
$vis = ($v | Select-String -Pattern 'VISION (Cloude' -SimpleMatch | Select-Object -First 1).LineNumber
'vision block at line ' + $vis
'--- top-level (column 0) function/export lines between the renderer (762) and the vision block:'
for ($i = 700; $i -lt $vis; $i++) {
  $l = $v[$i]
  if ($l -match '^(export |async function|function |const |let |\}\s*$)') { "$($i+1): $l" }
}
'--- THREE import'
$v[0..60] | Select-String -Pattern 'THREE' | Select-Object -First 3 | ForEach-Object { $_.Line.Trim() }
