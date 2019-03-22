const fuse = require('fuse');
const fs = require('fs');
const publicPath = "/public";
const partialsPath = "/partials";
const outputPath = "/fusepartials";

function fuseFile(filename,dontRecurse){
    console.log("fusing:" + filename);
    fuse.fuseFile("." + publicPath + partialsPath + "/" + filename, "." + publicPath + outputPath + "/" + filename, function (err, results) {
        if(err){
            console.log("ERROR: " + err);
        }else{
            if(!dontRecurse && (!process.env.NODE_ENV || process.env.NODE_ENV.toLowerCase() != "production")){
                fs.watchFile("." + publicPath + partialsPath + "/" + filename,function(type,name){
                    fuseFile(filename,true);
                });
                if(results.fused.length){
                    results.fused.forEach(function(fusedFile){
                        fs.watchFile("." + publicPath + partialsPath + fusedFile,function(type,name){
                            
                            fuseFile(filename,true);
                        });
                        
                    });
                }
            }
        }
        
    });
}

function fuseAllFiles(){
    
    fs.readdir("." + publicPath+partialsPath,function(err,results){
        var fileList = [];
        results.forEach(function(file){
           
                var split = file.split(".");
                if(split[split.length-1].toLowerCase() == "html")
                    fileList.push(file);
            
        });
        fileList.forEach(function(file){
            fuseFile(file);
        });
    });
    
}

module.exports = {
    fuseAllFiles : fuseAllFiles
}
