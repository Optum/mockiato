const fuse = require('fuse');
const fs = require('fs');
const publicPath = "/public";
const partialsPath = "/partials";
const outputPath = "/fusepartials";

function fuseFile(filename,dontRecurse){
    fuse.fuseFile(__basedir + publicPath + partialsPath + "/" + filename, __basedir + publicPath + outputPath + "/" + filename, function (err, results) {
        if(err){
            console.log("ERROR: " + err);
        }else{
            if(!dontRecurse && (!process.env.NODE_ENV || process.env.NODE_ENV.toLowerCase() != "production")){
                fs.watchFile(__basedir + publicPath + partialsPath + "/" + filename,function(type,name){
                    fuseFile(filename,true);
                });
                if(results.fused.length){
                    results.fused.forEach(function(fusedFile){
                        fs.watchFile(__basedir + publicPath + partialsPath + fusedFile,function(type,name){
                            
                            fuseFile(filename,true);
                        });
                        
                    });
                }
            }
        }
        
    });
}

function fuseAllFiles(){
    if (!fs.existsSync(__basedir + publicPath + outputPath)){
        fs.mkdirSync(__basedir + publicPath + outputPath);
    }
    fs.readdir(__basedir + publicPath+partialsPath,function(err,results){
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
