"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "proxy";
exports.ids = ["proxy"];
exports.modules = {

/***/ "(middleware)/./lib/safe-logger.ts":
/*!****************************!*\
  !*** ./lib/safe-logger.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   logError: () => (/* binding */ logError),\n/* harmony export */   logInfo: () => (/* binding */ logInfo),\n/* harmony export */   logWarn: () => (/* binding */ logWarn),\n/* harmony export */   sanitizeForLog: () => (/* binding */ sanitizeForLog)\n/* harmony export */ });\nconst SENSITIVE_KEY_PATTERN = /(token|secret|password|authorization|cookie|api[-_]?key|client[_-]?secret)/i;\nfunction redactString(value) {\n    return value.replace(/(access_token=)([^&\\s]+)/gi, \"$1[REDACTED]\").replace(/(Bearer\\s+)([^\\s]+)/gi, \"$1[REDACTED]\").replace(/([\"']?(?:token|accessToken|authorization|password|secret|apiKey|cookie|clientSecret)[\"']?\\s*[:=]\\s*[\"']?)([^\"',\\s}]+)/gi, \"$1[REDACTED]\").replace(/\\bEAA[A-Za-z0-9]+/g, \"[REDACTED_META_TOKEN]\");\n}\nfunction sanitizeForLog(value, depth = 0) {\n    if (depth > 4) {\n        return \"[Truncated]\";\n    }\n    if (typeof value === \"string\") {\n        return redactString(value);\n    }\n    if (typeof value === \"number\" || typeof value === \"boolean\" || value == null) {\n        return value;\n    }\n    if (value instanceof Error) {\n        return {\n            name: value.name,\n            message: redactString(value.message),\n            stack: value.stack ? redactString(value.stack) : undefined\n        };\n    }\n    if (Array.isArray(value)) {\n        return value.map((item)=>sanitizeForLog(item, depth + 1));\n    }\n    if (typeof value === \"object\") {\n        return Object.fromEntries(Object.entries(value).map(([key, currentValue])=>[\n                key,\n                SENSITIVE_KEY_PATTERN.test(key) ? \"[REDACTED]\" : sanitizeForLog(currentValue, depth + 1)\n            ]));\n    }\n    return String(value);\n}\nfunction logError(context, error, extra) {\n    if (typeof extra === \"undefined\") {\n        console.error(`[${context}]`, sanitizeForLog(error));\n        return;\n    }\n    console.error(`[${context}]`, sanitizeForLog(extra), sanitizeForLog(error));\n}\nfunction logInfo(context, payload) {\n    if (typeof payload === \"undefined\") {\n        console.info(`[${context}]`);\n        return;\n    }\n    console.info(`[${context}]`, sanitizeForLog(payload));\n}\nfunction logWarn(context, payload) {\n    if (typeof payload === \"undefined\") {\n        console.warn(`[${context}]`);\n        return;\n    }\n    console.warn(`[${context}]`, sanitizeForLog(payload));\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKG1pZGRsZXdhcmUpLy4vbGliL3NhZmUtbG9nZ2VyLnRzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQSxNQUFNQSx3QkFDSjtBQUVGLFNBQVNDLGFBQWFDLEtBQWE7SUFDakMsT0FBT0EsTUFDSkMsT0FBTyxDQUFDLDhCQUE4QixnQkFDdENBLE9BQU8sQ0FBQyx5QkFBeUIsZ0JBQ2pDQSxPQUFPLENBQ04sMkhBQ0EsZ0JBRURBLE9BQU8sQ0FBQyxzQkFBc0I7QUFDbkM7QUFFTyxTQUFTQyxlQUFlRixLQUFjLEVBQUVHLFFBQVEsQ0FBQztJQUN0RCxJQUFJQSxRQUFRLEdBQUc7UUFDYixPQUFPO0lBQ1Q7SUFFQSxJQUFJLE9BQU9ILFVBQVUsVUFBVTtRQUM3QixPQUFPRCxhQUFhQztJQUN0QjtJQUVBLElBQUksT0FBT0EsVUFBVSxZQUFZLE9BQU9BLFVBQVUsYUFBYUEsU0FBUyxNQUFNO1FBQzVFLE9BQU9BO0lBQ1Q7SUFFQSxJQUFJQSxpQkFBaUJJLE9BQU87UUFDMUIsT0FBTztZQUNMQyxNQUFNTCxNQUFNSyxJQUFJO1lBQ2hCQyxTQUFTUCxhQUFhQyxNQUFNTSxPQUFPO1lBQ25DQyxPQUFPUCxNQUFNTyxLQUFLLEdBQUdSLGFBQWFDLE1BQU1PLEtBQUssSUFBSUM7UUFDbkQ7SUFDRjtJQUVBLElBQUlDLE1BQU1DLE9BQU8sQ0FBQ1YsUUFBUTtRQUN4QixPQUFPQSxNQUFNVyxHQUFHLENBQUMsQ0FBQ0MsT0FBU1YsZUFBZVUsTUFBTVQsUUFBUTtJQUMxRDtJQUVBLElBQUksT0FBT0gsVUFBVSxVQUFVO1FBQzdCLE9BQU9hLE9BQU9DLFdBQVcsQ0FDdkJELE9BQU9FLE9BQU8sQ0FBQ2YsT0FBT1csR0FBRyxDQUFDLENBQUMsQ0FBQ0ssS0FBS0MsYUFBYSxHQUFLO2dCQUNqREQ7Z0JBQ0FsQixzQkFBc0JvQixJQUFJLENBQUNGLE9BQ3ZCLGVBQ0FkLGVBQWVlLGNBQWNkLFFBQVE7YUFDMUM7SUFFTDtJQUVBLE9BQU9nQixPQUFPbkI7QUFDaEI7QUFFTyxTQUFTb0IsU0FBU0MsT0FBZSxFQUFFQyxLQUFjLEVBQUVDLEtBQWU7SUFDdkUsSUFBSSxPQUFPQSxVQUFVLGFBQWE7UUFDaENDLFFBQVFGLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRUQsUUFBUSxDQUFDLENBQUMsRUFBRW5CLGVBQWVvQjtRQUM3QztJQUNGO0lBRUFFLFFBQVFGLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRUQsUUFBUSxDQUFDLENBQUMsRUFBRW5CLGVBQWVxQixRQUFRckIsZUFBZW9CO0FBQ3RFO0FBRU8sU0FBU0csUUFBUUosT0FBZSxFQUFFSyxPQUFpQjtJQUN4RCxJQUFJLE9BQU9BLFlBQVksYUFBYTtRQUNsQ0YsUUFBUUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFTixRQUFRLENBQUMsQ0FBQztRQUMzQjtJQUNGO0lBRUFHLFFBQVFHLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRU4sUUFBUSxDQUFDLENBQUMsRUFBRW5CLGVBQWV3QjtBQUM5QztBQUVPLFNBQVNFLFFBQVFQLE9BQWUsRUFBRUssT0FBaUI7SUFDeEQsSUFBSSxPQUFPQSxZQUFZLGFBQWE7UUFDbENGLFFBQVFLLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRVIsUUFBUSxDQUFDLENBQUM7UUFDM0I7SUFDRjtJQUVBRyxRQUFRSyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUVSLFFBQVEsQ0FBQyxDQUFDLEVBQUVuQixlQUFld0I7QUFDOUMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcZmVybmFcXERlc2t0b3BcXFBsYXRhZm9ybWEtT3BlcmFjaW9uYWwtR3JlYXRcXGxpYlxcc2FmZS1sb2dnZXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgU0VOU0lUSVZFX0tFWV9QQVRURVJOID1cclxuICAvKHRva2VufHNlY3JldHxwYXNzd29yZHxhdXRob3JpemF0aW9ufGNvb2tpZXxhcGlbLV9dP2tleXxjbGllbnRbXy1dP3NlY3JldCkvaVxyXG5cclxuZnVuY3Rpb24gcmVkYWN0U3RyaW5nKHZhbHVlOiBzdHJpbmcpIHtcclxuICByZXR1cm4gdmFsdWVcclxuICAgIC5yZXBsYWNlKC8oYWNjZXNzX3Rva2VuPSkoW14mXFxzXSspL2dpLCBcIiQxW1JFREFDVEVEXVwiKVxyXG4gICAgLnJlcGxhY2UoLyhCZWFyZXJcXHMrKShbXlxcc10rKS9naSwgXCIkMVtSRURBQ1RFRF1cIilcclxuICAgIC5yZXBsYWNlKFxyXG4gICAgICAvKFtcIiddPyg/OnRva2VufGFjY2Vzc1Rva2VufGF1dGhvcml6YXRpb258cGFzc3dvcmR8c2VjcmV0fGFwaUtleXxjb29raWV8Y2xpZW50U2VjcmV0KVtcIiddP1xccypbOj1dXFxzKltcIiddPykoW15cIicsXFxzfV0rKS9naSxcclxuICAgICAgXCIkMVtSRURBQ1RFRF1cIlxyXG4gICAgKVxyXG4gICAgLnJlcGxhY2UoL1xcYkVBQVtBLVphLXowLTldKy9nLCBcIltSRURBQ1RFRF9NRVRBX1RPS0VOXVwiKVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2FuaXRpemVGb3JMb2codmFsdWU6IHVua25vd24sIGRlcHRoID0gMCk6IHVua25vd24ge1xyXG4gIGlmIChkZXB0aCA+IDQpIHtcclxuICAgIHJldHVybiBcIltUcnVuY2F0ZWRdXCJcclxuICB9XHJcblxyXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpIHtcclxuICAgIHJldHVybiByZWRhY3RTdHJpbmcodmFsdWUpXHJcbiAgfVxyXG5cclxuICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiIHx8IHR5cGVvZiB2YWx1ZSA9PT0gXCJib29sZWFuXCIgfHwgdmFsdWUgPT0gbnVsbCkge1xyXG4gICAgcmV0dXJuIHZhbHVlXHJcbiAgfVxyXG5cclxuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBFcnJvcikge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgbmFtZTogdmFsdWUubmFtZSxcclxuICAgICAgbWVzc2FnZTogcmVkYWN0U3RyaW5nKHZhbHVlLm1lc3NhZ2UpLFxyXG4gICAgICBzdGFjazogdmFsdWUuc3RhY2sgPyByZWRhY3RTdHJpbmcodmFsdWUuc3RhY2spIDogdW5kZWZpbmVkLFxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XHJcbiAgICByZXR1cm4gdmFsdWUubWFwKChpdGVtKSA9PiBzYW5pdGl6ZUZvckxvZyhpdGVtLCBkZXB0aCArIDEpKVxyXG4gIH1cclxuXHJcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIikge1xyXG4gICAgcmV0dXJuIE9iamVjdC5mcm9tRW50cmllcyhcclxuICAgICAgT2JqZWN0LmVudHJpZXModmFsdWUpLm1hcCgoW2tleSwgY3VycmVudFZhbHVlXSkgPT4gW1xyXG4gICAgICAgIGtleSxcclxuICAgICAgICBTRU5TSVRJVkVfS0VZX1BBVFRFUk4udGVzdChrZXkpXHJcbiAgICAgICAgICA/IFwiW1JFREFDVEVEXVwiXHJcbiAgICAgICAgICA6IHNhbml0aXplRm9yTG9nKGN1cnJlbnRWYWx1ZSwgZGVwdGggKyAxKSxcclxuICAgICAgXSlcclxuICAgIClcclxuICB9XHJcblxyXG4gIHJldHVybiBTdHJpbmcodmFsdWUpXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBsb2dFcnJvcihjb250ZXh0OiBzdHJpbmcsIGVycm9yOiB1bmtub3duLCBleHRyYT86IHVua25vd24pIHtcclxuICBpZiAodHlwZW9mIGV4dHJhID09PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKGBbJHtjb250ZXh0fV1gLCBzYW5pdGl6ZUZvckxvZyhlcnJvcikpXHJcbiAgICByZXR1cm5cclxuICB9XHJcblxyXG4gIGNvbnNvbGUuZXJyb3IoYFske2NvbnRleHR9XWAsIHNhbml0aXplRm9yTG9nKGV4dHJhKSwgc2FuaXRpemVGb3JMb2coZXJyb3IpKVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbG9nSW5mbyhjb250ZXh0OiBzdHJpbmcsIHBheWxvYWQ/OiB1bmtub3duKSB7XHJcbiAgaWYgKHR5cGVvZiBwYXlsb2FkID09PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICBjb25zb2xlLmluZm8oYFske2NvbnRleHR9XWApXHJcbiAgICByZXR1cm5cclxuICB9XHJcblxyXG4gIGNvbnNvbGUuaW5mbyhgWyR7Y29udGV4dH1dYCwgc2FuaXRpemVGb3JMb2cocGF5bG9hZCkpXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBsb2dXYXJuKGNvbnRleHQ6IHN0cmluZywgcGF5bG9hZD86IHVua25vd24pIHtcclxuICBpZiAodHlwZW9mIHBheWxvYWQgPT09IFwidW5kZWZpbmVkXCIpIHtcclxuICAgIGNvbnNvbGUud2FybihgWyR7Y29udGV4dH1dYClcclxuICAgIHJldHVyblxyXG4gIH1cclxuXHJcbiAgY29uc29sZS53YXJuKGBbJHtjb250ZXh0fV1gLCBzYW5pdGl6ZUZvckxvZyhwYXlsb2FkKSlcclxufVxyXG4iXSwibmFtZXMiOlsiU0VOU0lUSVZFX0tFWV9QQVRURVJOIiwicmVkYWN0U3RyaW5nIiwidmFsdWUiLCJyZXBsYWNlIiwic2FuaXRpemVGb3JMb2ciLCJkZXB0aCIsIkVycm9yIiwibmFtZSIsIm1lc3NhZ2UiLCJzdGFjayIsInVuZGVmaW5lZCIsIkFycmF5IiwiaXNBcnJheSIsIm1hcCIsIml0ZW0iLCJPYmplY3QiLCJmcm9tRW50cmllcyIsImVudHJpZXMiLCJrZXkiLCJjdXJyZW50VmFsdWUiLCJ0ZXN0IiwiU3RyaW5nIiwibG9nRXJyb3IiLCJjb250ZXh0IiwiZXJyb3IiLCJleHRyYSIsImNvbnNvbGUiLCJsb2dJbmZvIiwicGF5bG9hZCIsImluZm8iLCJsb2dXYXJuIiwid2FybiJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(middleware)/./lib/safe-logger.ts\n");

/***/ }),

/***/ "(middleware)/./node_modules/next/dist/build/webpack/loaders/next-middleware-loader.js?absolutePagePath=C%3A%5CUsers%5Cferna%5CDesktop%5CPlataforma-Operacional-Great%5Cproxy.ts&page=%2Fproxy&rootDir=C%3A%5CUsers%5Cferna%5CDesktop%5CPlataforma-Operacional-Great&matchers=&preferredRegion=&middlewareConfig=e30%3D!":
/*!******************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-middleware-loader.js?absolutePagePath=C%3A%5CUsers%5Cferna%5CDesktop%5CPlataforma-Operacional-Great%5Cproxy.ts&page=%2Fproxy&rootDir=C%3A%5CUsers%5Cferna%5CDesktop%5CPlataforma-Operacional-Great&matchers=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \******************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_web_globals__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/web/globals */ \"(middleware)/./node_modules/next/dist/server/web/globals.js\");\n/* harmony import */ var next_dist_server_web_globals__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_web_globals__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_web_adapter__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/web/adapter */ \"(middleware)/./node_modules/next/dist/server/web/adapter.js\");\n/* harmony import */ var next_dist_server_web_adapter__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_web_adapter__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _proxy_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./proxy.ts */ \"(middleware)/./proxy.ts\");\n/* harmony import */ var next_dist_client_components_is_next_router_error__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! next/dist/client/components/is-next-router-error */ \"(middleware)/./node_modules/next/dist/client/components/is-next-router-error.js\");\n/* harmony import */ var next_dist_client_components_is_next_router_error__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(next_dist_client_components_is_next_router_error__WEBPACK_IMPORTED_MODULE_3__);\n\n\n// Import the userland code.\n\n\n\nconst mod = {\n    ..._proxy_ts__WEBPACK_IMPORTED_MODULE_2__\n};\nconst page = \"/proxy\";\nconst isProxy = page === '/proxy' || page === '/src/proxy';\nconst handlerUserland = (isProxy ? mod.proxy : mod.middleware) || mod.default;\nclass ProxyMissingExportError extends Error {\n    constructor(message){\n        super(message);\n        // Stack isn't useful here, remove it considering it spams logs during development.\n        this.stack = '';\n    }\n}\n// TODO: This spams logs during development. Find a better way to handle this.\n// Removing this will spam \"fn is not a function\" logs which is worse.\nif (typeof handlerUserland !== 'function') {\n    throw new ProxyMissingExportError(`The ${isProxy ? 'Proxy' : 'Middleware'} file \"${page}\" must export a function named \\`${isProxy ? 'proxy' : 'middleware'}\\` or a default function.`);\n}\n// Proxy will only sent out the FetchEvent to next server,\n// so load instrumentation module here and track the error inside proxy module.\nfunction errorHandledHandler(fn) {\n    return async (...args)=>{\n        try {\n            return await fn(...args);\n        } catch (err) {\n            // In development, error the navigation API usage in runtime,\n            // since it's not allowed to be used in proxy as it's outside of react component tree.\n            if (true) {\n                if ((0,next_dist_client_components_is_next_router_error__WEBPACK_IMPORTED_MODULE_3__.isNextRouterError)(err)) {\n                    err.message = `Next.js navigation API is not allowed to be used in ${isProxy ? 'Proxy' : 'Middleware'}.`;\n                    throw err;\n                }\n            }\n            const req = args[0];\n            const url = new URL(req.url);\n            const resource = url.pathname + url.search;\n            await (0,next_dist_server_web_globals__WEBPACK_IMPORTED_MODULE_0__.edgeInstrumentationOnRequestError)(err, {\n                path: resource,\n                method: req.method,\n                headers: Object.fromEntries(req.headers.entries())\n            }, {\n                routerKind: 'Pages Router',\n                routePath: '/proxy',\n                routeType: 'proxy',\n                revalidateReason: undefined\n            });\n            throw err;\n        }\n    };\n}\nconst handler = (opts)=>{\n    return (0,next_dist_server_web_adapter__WEBPACK_IMPORTED_MODULE_1__.adapter)({\n        ...opts,\n        page,\n        handler: errorHandledHandler(handlerUserland)\n    });\n};\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (handler);\n\n//# sourceMappingURL=middleware.js.map\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKG1pZGRsZXdhcmUpLy4vbm9kZV9tb2R1bGVzL25leHQvZGlzdC9idWlsZC93ZWJwYWNrL2xvYWRlcnMvbmV4dC1taWRkbGV3YXJlLWxvYWRlci5qcz9hYnNvbHV0ZVBhZ2VQYXRoPUMlM0ElNUNVc2VycyU1Q2Zlcm5hJTVDRGVza3RvcCU1Q1BsYXRhZm9ybWEtT3BlcmFjaW9uYWwtR3JlYXQlNUNwcm94eS50cyZwYWdlPSUyRnByb3h5JnJvb3REaXI9QyUzQSU1Q1VzZXJzJTVDZmVybmElNUNEZXNrdG9wJTVDUGxhdGFmb3JtYS1PcGVyYWNpb25hbC1HcmVhdCZtYXRjaGVycz0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBc0M7QUFDaUI7QUFDdkQ7QUFDbUM7QUFDOEM7QUFDSTtBQUNyRjtBQUNBLE9BQU8sc0NBQUk7QUFDWDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNkNBQTZDLGtDQUFrQyxRQUFRLEtBQUssbUNBQW1DLGlDQUFpQztBQUNoSztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0EsZ0JBQWdCLElBQXFDO0FBQ3JELG9CQUFvQixtR0FBaUI7QUFDckMseUZBQXlGLGlDQUFpQztBQUMxSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxrQkFBa0IsK0ZBQWlDO0FBQ25EO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVyxxRUFBTztBQUNsQjtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQSxpRUFBZSxPQUFPLEVBQUM7O0FBRXZCIiwic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFwibmV4dC9kaXN0L3NlcnZlci93ZWIvZ2xvYmFsc1wiO1xuaW1wb3J0IHsgYWRhcHRlciB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3dlYi9hZGFwdGVyXCI7XG4vLyBJbXBvcnQgdGhlIHVzZXJsYW5kIGNvZGUuXG5pbXBvcnQgKiBhcyBfbW9kIGZyb20gXCIuL3Byb3h5LnRzXCI7XG5pbXBvcnQgeyBlZGdlSW5zdHJ1bWVudGF0aW9uT25SZXF1ZXN0RXJyb3IgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci93ZWIvZ2xvYmFsc1wiO1xuaW1wb3J0IHsgaXNOZXh0Um91dGVyRXJyb3IgfSBmcm9tIFwibmV4dC9kaXN0L2NsaWVudC9jb21wb25lbnRzL2lzLW5leHQtcm91dGVyLWVycm9yXCI7XG5jb25zdCBtb2QgPSB7XG4gICAgLi4uX21vZFxufTtcbmNvbnN0IHBhZ2UgPSBcIi9wcm94eVwiO1xuY29uc3QgaXNQcm94eSA9IHBhZ2UgPT09ICcvcHJveHknIHx8IHBhZ2UgPT09ICcvc3JjL3Byb3h5JztcbmNvbnN0IGhhbmRsZXJVc2VybGFuZCA9IChpc1Byb3h5ID8gbW9kLnByb3h5IDogbW9kLm1pZGRsZXdhcmUpIHx8IG1vZC5kZWZhdWx0O1xuY2xhc3MgUHJveHlNaXNzaW5nRXhwb3J0RXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gICAgY29uc3RydWN0b3IobWVzc2FnZSl7XG4gICAgICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgICAgICAvLyBTdGFjayBpc24ndCB1c2VmdWwgaGVyZSwgcmVtb3ZlIGl0IGNvbnNpZGVyaW5nIGl0IHNwYW1zIGxvZ3MgZHVyaW5nIGRldmVsb3BtZW50LlxuICAgICAgICB0aGlzLnN0YWNrID0gJyc7XG4gICAgfVxufVxuLy8gVE9ETzogVGhpcyBzcGFtcyBsb2dzIGR1cmluZyBkZXZlbG9wbWVudC4gRmluZCBhIGJldHRlciB3YXkgdG8gaGFuZGxlIHRoaXMuXG4vLyBSZW1vdmluZyB0aGlzIHdpbGwgc3BhbSBcImZuIGlzIG5vdCBhIGZ1bmN0aW9uXCIgbG9ncyB3aGljaCBpcyB3b3JzZS5cbmlmICh0eXBlb2YgaGFuZGxlclVzZXJsYW5kICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFByb3h5TWlzc2luZ0V4cG9ydEVycm9yKGBUaGUgJHtpc1Byb3h5ID8gJ1Byb3h5JyA6ICdNaWRkbGV3YXJlJ30gZmlsZSBcIiR7cGFnZX1cIiBtdXN0IGV4cG9ydCBhIGZ1bmN0aW9uIG5hbWVkIFxcYCR7aXNQcm94eSA/ICdwcm94eScgOiAnbWlkZGxld2FyZSd9XFxgIG9yIGEgZGVmYXVsdCBmdW5jdGlvbi5gKTtcbn1cbi8vIFByb3h5IHdpbGwgb25seSBzZW50IG91dCB0aGUgRmV0Y2hFdmVudCB0byBuZXh0IHNlcnZlcixcbi8vIHNvIGxvYWQgaW5zdHJ1bWVudGF0aW9uIG1vZHVsZSBoZXJlIGFuZCB0cmFjayB0aGUgZXJyb3IgaW5zaWRlIHByb3h5IG1vZHVsZS5cbmZ1bmN0aW9uIGVycm9ySGFuZGxlZEhhbmRsZXIoZm4pIHtcbiAgICByZXR1cm4gYXN5bmMgKC4uLmFyZ3MpPT57XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgZm4oLi4uYXJncyk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgLy8gSW4gZGV2ZWxvcG1lbnQsIGVycm9yIHRoZSBuYXZpZ2F0aW9uIEFQSSB1c2FnZSBpbiBydW50aW1lLFxuICAgICAgICAgICAgLy8gc2luY2UgaXQncyBub3QgYWxsb3dlZCB0byBiZSB1c2VkIGluIHByb3h5IGFzIGl0J3Mgb3V0c2lkZSBvZiByZWFjdCBjb21wb25lbnQgdHJlZS5cbiAgICAgICAgICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTmV4dFJvdXRlckVycm9yKGVycikpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyLm1lc3NhZ2UgPSBgTmV4dC5qcyBuYXZpZ2F0aW9uIEFQSSBpcyBub3QgYWxsb3dlZCB0byBiZSB1c2VkIGluICR7aXNQcm94eSA/ICdQcm94eScgOiAnTWlkZGxld2FyZSd9LmA7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCByZXEgPSBhcmdzWzBdO1xuICAgICAgICAgICAgY29uc3QgdXJsID0gbmV3IFVSTChyZXEudXJsKTtcbiAgICAgICAgICAgIGNvbnN0IHJlc291cmNlID0gdXJsLnBhdGhuYW1lICsgdXJsLnNlYXJjaDtcbiAgICAgICAgICAgIGF3YWl0IGVkZ2VJbnN0cnVtZW50YXRpb25PblJlcXVlc3RFcnJvcihlcnIsIHtcbiAgICAgICAgICAgICAgICBwYXRoOiByZXNvdXJjZSxcbiAgICAgICAgICAgICAgICBtZXRob2Q6IHJlcS5tZXRob2QsXG4gICAgICAgICAgICAgICAgaGVhZGVyczogT2JqZWN0LmZyb21FbnRyaWVzKHJlcS5oZWFkZXJzLmVudHJpZXMoKSlcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICByb3V0ZXJLaW5kOiAnUGFnZXMgUm91dGVyJyxcbiAgICAgICAgICAgICAgICByb3V0ZVBhdGg6ICcvcHJveHknLFxuICAgICAgICAgICAgICAgIHJvdXRlVHlwZTogJ3Byb3h5JyxcbiAgICAgICAgICAgICAgICByZXZhbGlkYXRlUmVhc29uOiB1bmRlZmluZWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgfTtcbn1cbmNvbnN0IGhhbmRsZXIgPSAob3B0cyk9PntcbiAgICByZXR1cm4gYWRhcHRlcih7XG4gICAgICAgIC4uLm9wdHMsXG4gICAgICAgIHBhZ2UsXG4gICAgICAgIGhhbmRsZXI6IGVycm9ySGFuZGxlZEhhbmRsZXIoaGFuZGxlclVzZXJsYW5kKVxuICAgIH0pO1xufTtcbmV4cG9ydCBkZWZhdWx0IGhhbmRsZXI7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1pZGRsZXdhcmUuanMubWFwXG4iXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(middleware)/./node_modules/next/dist/build/webpack/loaders/next-middleware-loader.js?absolutePagePath=C%3A%5CUsers%5Cferna%5CDesktop%5CPlataforma-Operacional-Great%5Cproxy.ts&page=%2Fproxy&rootDir=C%3A%5CUsers%5Cferna%5CDesktop%5CPlataforma-Operacional-Great&matchers=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(middleware)/./proxy.ts":
/*!******************!*\
  !*** ./proxy.ts ***!
  \******************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   config: () => (/* binding */ config),\n/* harmony export */   proxy: () => (/* binding */ proxy)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(middleware)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var next_auth_jwt__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next-auth/jwt */ \"(middleware)/./node_modules/next-auth/jwt/index.js\");\n/* harmony import */ var next_auth_jwt__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(next_auth_jwt__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _lib_safe_logger__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/lib/safe-logger */ \"(middleware)/./lib/safe-logger.ts\");\n\n\n\nconst PUBLIC_API_PATHS = new Set([\n    \"/api/auth\",\n    \"/api/auth/csrf\",\n    \"/api/auth/error\",\n    \"/api/auth/providers\",\n    \"/api/auth/session\",\n    \"/api/auth/signin\",\n    \"/api/auth/signout\",\n    \"/api/auth/verify-request\"\n]);\nconst PUBLIC_API_PREFIXES = [\n    \"/api/auth/callback/\",\n    \"/api/cron/\",\n    \"/api/test/\"\n];\nfunction isPublicApiPath(pathname) {\n    return PUBLIC_API_PATHS.has(pathname) || PUBLIC_API_PREFIXES.some((prefix)=>pathname.startsWith(prefix));\n}\nfunction isProtectedApiPath(pathname) {\n    return pathname.startsWith(\"/api\") && !isPublicApiPath(pathname);\n}\nasync function proxy(request) {\n    const { pathname, search } = request.nextUrl;\n    if (isPublicApiPath(pathname)) {\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.next();\n    }\n    if (!process.env.NEXTAUTH_SECRET?.trim()) {\n        (0,_lib_safe_logger__WEBPACK_IMPORTED_MODULE_2__.logWarn)(\"auth.proxy.missing-secret\", {\n            pathname\n        });\n    }\n    const token = await (0,next_auth_jwt__WEBPACK_IMPORTED_MODULE_1__.getToken)({\n        req: request,\n        secret: process.env.NEXTAUTH_SECRET\n    });\n    if (pathname === \"/login\" && token) {\n        (0,_lib_safe_logger__WEBPACK_IMPORTED_MODULE_2__.logInfo)(\"auth.proxy.redirect-login-to-dashboard\", {\n            pathname,\n            hasToken: true\n        });\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.redirect(new URL(\"/dashboard\", request.url));\n    }\n    if (pathname.startsWith(\"/dashboard\") && !token) {\n        const callbackUrl = `${pathname}${search}`;\n        const loginUrl = new URL(\"/login\", request.url);\n        if (callbackUrl && callbackUrl !== \"/dashboard\") {\n            loginUrl.searchParams.set(\"callbackUrl\", callbackUrl);\n        }\n        (0,_lib_safe_logger__WEBPACK_IMPORTED_MODULE_2__.logInfo)(\"auth.proxy.redirect-dashboard-to-login\", {\n            pathname,\n            callbackUrl: callbackUrl || null,\n            hasToken: false\n        });\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.redirect(loginUrl);\n    }\n    if (isProtectedApiPath(pathname) && !token) {\n        (0,_lib_safe_logger__WEBPACK_IMPORTED_MODULE_2__.logInfo)(\"auth.proxy.block-api\", {\n            pathname,\n            hasToken: false\n        });\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: \"Nao autorizado\"\n        }, {\n            status: 401\n        });\n    }\n    return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.next();\n}\nconst config = {\n    matcher: [\n        \"/login\",\n        \"/dashboard/:path*\",\n        \"/api/:path*\"\n    ]\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKG1pZGRsZXdhcmUpLy4vcHJveHkudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQTBDO0FBRUY7QUFDWTtBQUVwRCxNQUFNSSxtQkFBbUIsSUFBSUMsSUFBSTtJQUMvQjtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0NBQ0Q7QUFFRCxNQUFNQyxzQkFBc0I7SUFBQztJQUF1QjtJQUFjO0NBQWE7QUFFL0UsU0FBU0MsZ0JBQWdCQyxRQUFnQjtJQUN2QyxPQUNFSixpQkFBaUJLLEdBQUcsQ0FBQ0QsYUFDbEJGLG9CQUFvQkksSUFBSSxDQUFDLENBQUNDLFNBQVdILFNBQVNJLFVBQVUsQ0FBQ0Q7QUFFaEU7QUFFQSxTQUFTRSxtQkFBbUJMLFFBQWdCO0lBQzFDLE9BQU9BLFNBQVNJLFVBQVUsQ0FBQyxXQUFXLENBQUNMLGdCQUFnQkM7QUFDekQ7QUFFTyxlQUFlTSxNQUFNQyxPQUFvQjtJQUM5QyxNQUFNLEVBQUVQLFFBQVEsRUFBRVEsTUFBTSxFQUFFLEdBQUdELFFBQVFFLE9BQU87SUFFNUMsSUFBSVYsZ0JBQWdCQyxXQUFXO1FBQzdCLE9BQU9SLHFEQUFZQSxDQUFDa0IsSUFBSTtJQUMxQjtJQUVBLElBQUksQ0FBQ0MsUUFBUUMsR0FBRyxDQUFDQyxlQUFlLEVBQUVDLFFBQVE7UUFDeENuQix5REFBT0EsQ0FBQyw2QkFBNkI7WUFDbkNLO1FBQ0Y7SUFDRjtJQUVBLE1BQU1lLFFBQVEsTUFBTXRCLHVEQUFRQSxDQUFDO1FBQzNCdUIsS0FBS1Q7UUFDTFUsUUFBUU4sUUFBUUMsR0FBRyxDQUFDQyxlQUFlO0lBQ3JDO0lBRUEsSUFBSWIsYUFBYSxZQUFZZSxPQUFPO1FBQ2xDckIseURBQU9BLENBQUMsMENBQTBDO1lBQ2hETTtZQUNBa0IsVUFBVTtRQUNaO1FBQ0EsT0FBTzFCLHFEQUFZQSxDQUFDMkIsUUFBUSxDQUFDLElBQUlDLElBQUksY0FBY2IsUUFBUWMsR0FBRztJQUNoRTtJQUVBLElBQUlyQixTQUFTSSxVQUFVLENBQUMsaUJBQWlCLENBQUNXLE9BQU87UUFDL0MsTUFBTU8sY0FBYyxHQUFHdEIsV0FBV1EsUUFBUTtRQUMxQyxNQUFNZSxXQUFXLElBQUlILElBQUksVUFBVWIsUUFBUWMsR0FBRztRQUU5QyxJQUFJQyxlQUFlQSxnQkFBZ0IsY0FBYztZQUMvQ0MsU0FBU0MsWUFBWSxDQUFDQyxHQUFHLENBQUMsZUFBZUg7UUFDM0M7UUFFQTVCLHlEQUFPQSxDQUFDLDBDQUEwQztZQUNoRE07WUFDQXNCLGFBQWFBLGVBQWU7WUFDNUJKLFVBQVU7UUFDWjtRQUVBLE9BQU8xQixxREFBWUEsQ0FBQzJCLFFBQVEsQ0FBQ0k7SUFDL0I7SUFFQSxJQUFJbEIsbUJBQW1CTCxhQUFhLENBQUNlLE9BQU87UUFDMUNyQix5REFBT0EsQ0FBQyx3QkFBd0I7WUFDOUJNO1lBQ0FrQixVQUFVO1FBQ1o7UUFDQSxPQUFPMUIscURBQVlBLENBQUNrQyxJQUFJLENBQUM7WUFBRUMsT0FBTztRQUFpQixHQUFHO1lBQUVDLFFBQVE7UUFBSTtJQUN0RTtJQUVBLE9BQU9wQyxxREFBWUEsQ0FBQ2tCLElBQUk7QUFDMUI7QUFFTyxNQUFNbUIsU0FBUztJQUNwQkMsU0FBUztRQUNQO1FBQ0E7UUFDQTtLQUNEO0FBQ0gsRUFBQyIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxmZXJuYVxcRGVza3RvcFxcUGxhdGFmb3JtYS1PcGVyYWNpb25hbC1HcmVhdFxccHJveHkudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmV4dFJlc3BvbnNlIH0gZnJvbSBcIm5leHQvc2VydmVyXCJcclxuaW1wb3J0IHR5cGUgeyBOZXh0UmVxdWVzdCB9IGZyb20gXCJuZXh0L3NlcnZlclwiXHJcbmltcG9ydCB7IGdldFRva2VuIH0gZnJvbSBcIm5leHQtYXV0aC9qd3RcIlxyXG5pbXBvcnQgeyBsb2dJbmZvLCBsb2dXYXJuIH0gZnJvbSBcIkAvbGliL3NhZmUtbG9nZ2VyXCJcclxuXHJcbmNvbnN0IFBVQkxJQ19BUElfUEFUSFMgPSBuZXcgU2V0KFtcclxuICBcIi9hcGkvYXV0aFwiLFxyXG4gIFwiL2FwaS9hdXRoL2NzcmZcIixcclxuICBcIi9hcGkvYXV0aC9lcnJvclwiLFxyXG4gIFwiL2FwaS9hdXRoL3Byb3ZpZGVyc1wiLFxyXG4gIFwiL2FwaS9hdXRoL3Nlc3Npb25cIixcclxuICBcIi9hcGkvYXV0aC9zaWduaW5cIixcclxuICBcIi9hcGkvYXV0aC9zaWdub3V0XCIsXHJcbiAgXCIvYXBpL2F1dGgvdmVyaWZ5LXJlcXVlc3RcIixcclxuXSlcclxuXHJcbmNvbnN0IFBVQkxJQ19BUElfUFJFRklYRVMgPSBbXCIvYXBpL2F1dGgvY2FsbGJhY2svXCIsIFwiL2FwaS9jcm9uL1wiLCBcIi9hcGkvdGVzdC9cIl1cclxuXHJcbmZ1bmN0aW9uIGlzUHVibGljQXBpUGF0aChwYXRobmFtZTogc3RyaW5nKSB7XHJcbiAgcmV0dXJuIChcclxuICAgIFBVQkxJQ19BUElfUEFUSFMuaGFzKHBhdGhuYW1lKVxyXG4gICAgfHwgUFVCTElDX0FQSV9QUkVGSVhFUy5zb21lKChwcmVmaXgpID0+IHBhdGhuYW1lLnN0YXJ0c1dpdGgocHJlZml4KSlcclxuICApXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzUHJvdGVjdGVkQXBpUGF0aChwYXRobmFtZTogc3RyaW5nKSB7XHJcbiAgcmV0dXJuIHBhdGhuYW1lLnN0YXJ0c1dpdGgoXCIvYXBpXCIpICYmICFpc1B1YmxpY0FwaVBhdGgocGF0aG5hbWUpXHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcm94eShyZXF1ZXN0OiBOZXh0UmVxdWVzdCkge1xyXG4gIGNvbnN0IHsgcGF0aG5hbWUsIHNlYXJjaCB9ID0gcmVxdWVzdC5uZXh0VXJsXHJcblxyXG4gIGlmIChpc1B1YmxpY0FwaVBhdGgocGF0aG5hbWUpKSB7XHJcbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLm5leHQoKVxyXG4gIH1cclxuXHJcbiAgaWYgKCFwcm9jZXNzLmVudi5ORVhUQVVUSF9TRUNSRVQ/LnRyaW0oKSkge1xyXG4gICAgbG9nV2FybihcImF1dGgucHJveHkubWlzc2luZy1zZWNyZXRcIiwge1xyXG4gICAgICBwYXRobmFtZSxcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICBjb25zdCB0b2tlbiA9IGF3YWl0IGdldFRva2VuKHtcclxuICAgIHJlcTogcmVxdWVzdCxcclxuICAgIHNlY3JldDogcHJvY2Vzcy5lbnYuTkVYVEFVVEhfU0VDUkVULFxyXG4gIH0pXHJcblxyXG4gIGlmIChwYXRobmFtZSA9PT0gXCIvbG9naW5cIiAmJiB0b2tlbikge1xyXG4gICAgbG9nSW5mbyhcImF1dGgucHJveHkucmVkaXJlY3QtbG9naW4tdG8tZGFzaGJvYXJkXCIsIHtcclxuICAgICAgcGF0aG5hbWUsXHJcbiAgICAgIGhhc1Rva2VuOiB0cnVlLFxyXG4gICAgfSlcclxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UucmVkaXJlY3QobmV3IFVSTChcIi9kYXNoYm9hcmRcIiwgcmVxdWVzdC51cmwpKVxyXG4gIH1cclxuXHJcbiAgaWYgKHBhdGhuYW1lLnN0YXJ0c1dpdGgoXCIvZGFzaGJvYXJkXCIpICYmICF0b2tlbikge1xyXG4gICAgY29uc3QgY2FsbGJhY2tVcmwgPSBgJHtwYXRobmFtZX0ke3NlYXJjaH1gXHJcbiAgICBjb25zdCBsb2dpblVybCA9IG5ldyBVUkwoXCIvbG9naW5cIiwgcmVxdWVzdC51cmwpXHJcblxyXG4gICAgaWYgKGNhbGxiYWNrVXJsICYmIGNhbGxiYWNrVXJsICE9PSBcIi9kYXNoYm9hcmRcIikge1xyXG4gICAgICBsb2dpblVybC5zZWFyY2hQYXJhbXMuc2V0KFwiY2FsbGJhY2tVcmxcIiwgY2FsbGJhY2tVcmwpXHJcbiAgICB9XHJcblxyXG4gICAgbG9nSW5mbyhcImF1dGgucHJveHkucmVkaXJlY3QtZGFzaGJvYXJkLXRvLWxvZ2luXCIsIHtcclxuICAgICAgcGF0aG5hbWUsXHJcbiAgICAgIGNhbGxiYWNrVXJsOiBjYWxsYmFja1VybCB8fCBudWxsLFxyXG4gICAgICBoYXNUb2tlbjogZmFsc2UsXHJcbiAgICB9KVxyXG5cclxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UucmVkaXJlY3QobG9naW5VcmwpXHJcbiAgfVxyXG5cclxuICBpZiAoaXNQcm90ZWN0ZWRBcGlQYXRoKHBhdGhuYW1lKSAmJiAhdG9rZW4pIHtcclxuICAgIGxvZ0luZm8oXCJhdXRoLnByb3h5LmJsb2NrLWFwaVwiLCB7XHJcbiAgICAgIHBhdGhuYW1lLFxyXG4gICAgICBoYXNUb2tlbjogZmFsc2UsXHJcbiAgICB9KVxyXG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6IFwiTmFvIGF1dG9yaXphZG9cIiB9LCB7IHN0YXR1czogNDAxIH0pXHJcbiAgfVxyXG5cclxuICByZXR1cm4gTmV4dFJlc3BvbnNlLm5leHQoKVxyXG59XHJcblxyXG5leHBvcnQgY29uc3QgY29uZmlnID0ge1xyXG4gIG1hdGNoZXI6IFtcclxuICAgIFwiL2xvZ2luXCIsXHJcbiAgICBcIi9kYXNoYm9hcmQvOnBhdGgqXCIsXHJcbiAgICBcIi9hcGkvOnBhdGgqXCIsXHJcbiAgXSxcclxufVxyXG4iXSwibmFtZXMiOlsiTmV4dFJlc3BvbnNlIiwiZ2V0VG9rZW4iLCJsb2dJbmZvIiwibG9nV2FybiIsIlBVQkxJQ19BUElfUEFUSFMiLCJTZXQiLCJQVUJMSUNfQVBJX1BSRUZJWEVTIiwiaXNQdWJsaWNBcGlQYXRoIiwicGF0aG5hbWUiLCJoYXMiLCJzb21lIiwicHJlZml4Iiwic3RhcnRzV2l0aCIsImlzUHJvdGVjdGVkQXBpUGF0aCIsInByb3h5IiwicmVxdWVzdCIsInNlYXJjaCIsIm5leHRVcmwiLCJuZXh0IiwicHJvY2VzcyIsImVudiIsIk5FWFRBVVRIX1NFQ1JFVCIsInRyaW0iLCJ0b2tlbiIsInJlcSIsInNlY3JldCIsImhhc1Rva2VuIiwicmVkaXJlY3QiLCJVUkwiLCJ1cmwiLCJjYWxsYmFja1VybCIsImxvZ2luVXJsIiwic2VhcmNoUGFyYW1zIiwic2V0IiwianNvbiIsImVycm9yIiwic3RhdHVzIiwiY29uZmlnIiwibWF0Y2hlciJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(middleware)/./proxy.ts\n");

/***/ }),

/***/ "../app-render/after-task-async-storage.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/app-render/after-task-async-storage.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "../incremental-cache/tags-manifest.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/lib/incremental-cache/tags-manifest.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/server/lib/incremental-cache/tags-manifest.external.js");

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("buffer");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("events");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "node:async_hooks":
/*!***********************************!*\
  !*** external "node:async_hooks" ***!
  \***********************************/
/***/ ((module) => {

module.exports = require("node:async_hooks");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("util");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("zlib");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("./webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/next-auth","vendor-chunks/@babel","vendor-chunks/jose","vendor-chunks/uuid","vendor-chunks/@panva"], () => (__webpack_exec__("(middleware)/./node_modules/next/dist/build/webpack/loaders/next-middleware-loader.js?absolutePagePath=C%3A%5CUsers%5Cferna%5CDesktop%5CPlataforma-Operacional-Great%5Cproxy.ts&page=%2Fproxy&rootDir=C%3A%5CUsers%5Cferna%5CDesktop%5CPlataforma-Operacional-Great&matchers=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();