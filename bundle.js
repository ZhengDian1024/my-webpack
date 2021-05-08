// 获取主文件入口
const fs = require('fs')
const path = require('path')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const babel = require('@babel/core')

const getModuleInfo = file => {
    const body = fs.readFileSync(file, 'utf-8')
    const ast = parser.parse(body, { sourceType: 'module' })
    // console.log(ast.program.body)
    const deps = {}
    traverse(ast, {
        ImportDeclaration({ node }) {
            const dirname = path.dirname(file)
            const absPath = './' + path.join(dirname, node.source.value) + '.js'
            console.log(node, absPath)
            deps[node.source.value] = absPath
        }
    })
    // console.log(deps)

    const { code } = babel.transformFromAst(ast, null, {
        presets: ['@babel/preset-env']
    })
    // console.log(code)
    const moduleInfo = { file, deps, code }
    console.log(moduleInfo)
    return moduleInfo
}

const parseModules = file => {
    const entry = getModuleInfo(file)
    const temp = [entry]
    for (let i = 0; i < temp.length; i++) {
        const deps = temp[i].deps
        if (deps) {
            for (const key in deps) {
                if (deps.hasOwnProperty(key)) {
                    temp.push(getModuleInfo(deps[key]))
                }
            }
        }
    }
    // console.log(temp)
    const depsGraph = {}
    temp.forEach(item => {
        const { file, deps, code } = item
        depsGraph[file] = {
            deps,
            code,
        }
    })
    // console.log(depsGraph)
    return depsGraph
}

const bundle = file => {
    const depsGraph = JSON.stringify(parseModules(file))
    return `(function(graph) {
        function require(file){
            function absRequire(relPath) {
                return require(graph[file].deps[relPath])
            }
            var exports = {};
            (function (require, exports, code) {
                eval(code)
            })(absRequire, exports, graph[file].code);
            return exports
        }
        require('${file}')
    })(${depsGraph})`
}

const content = bundle('./src/index.js')
console.log(content)

fs.mkdirSync('./dist')
fs.writeFileSync('./dist/bundle.js', content)
