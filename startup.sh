#!/bin/bash

outputPath="public/javascripts/min.js"
inputPaths="src/client/startup.js src/client/**.js src/shared/RegionNode.js src/shared/global_constants.js src/shared/global_functions.js"

echo gathering source files:
echo $inputPaths

echo minifying source files...
java -jar compiler.jar --language_in=ECMASCRIPT6 --language_out=ES5 --js_output_file=$outputPath $inputPaths
echo source files minified

echo killing server...
pidof nodejs | awk '{print "kill " $1}' | sh
echo server killed

echo starting server...
cd /root/sand
export NODE_ENV=production
nohup nodejs src/www &
cd -
echo server started
