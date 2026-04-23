<?php

$dir = new RecursiveDirectoryIterator(__DIR__ . '/app');
$iterator = new RecursiveIteratorIterator($dir);
$regex = new RegexIterator($iterator, '/^.+\.php$/i', RecursiveRegexIterator::GET_MATCH);

echo "Checking for syntax errors in /app...\n";
foreach ($regex as $file) {
    exec("php -l " . escapeshellarg($file[0]), $output, $return);
    if ($return !== 0) {
        echo "SYNTAX ERROR in " . $file[0] . ":\n";
        echo implode("\n", $output) . "\n\n";
    }
    unset($output);
}
echo "Done.\n";
