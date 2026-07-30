Add-Type -AssemblyName System.Web
$port = 8000
$root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$port/"
while ($listener.IsListening) {
    $context = $listener.GetContext()
    $url = $context.Request.Url.LocalPath
    $path = Join-Path $root ($url.TrimStart('/'))
    if ([string]::IsNullOrEmpty($url) -or $url -eq '/') { $path = Join-Path $root 'index.html' }
    if (Test-Path $path -PathType Leaf) {
        $mime = [System.Web.MimeMapping]::GetMimeMapping($path)
        $bytes = [System.IO.File]::ReadAllBytes($path)
        $context.Response.ContentType = $mime
        $context.Response.ContentLength64 = $bytes.Length
        $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $context.Response.StatusCode = 404
    }
    $context.Response.Close()
}
