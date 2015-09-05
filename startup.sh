#!/bin/bash

# add files to be excluded from the minified output to the 'exclude' variable
# i.e. exclude="file1\|file2"
exclude="dune_functions"

sharedFiles=`ls src/shared/*.js | grep -v -w $exclude`
inputPaths="src/client/startup.js src/client/**.js $sharedFiles"

outputPath="public/javascripts/min.js"

echo gathering source files:
echo $inputPaths

echo minifying source files...
java -jar compiler.jar --language_in=ECMASCRIPT6 --language_out=ES5 --js_output_file=$outputPath $inputPaths
echo done.