function cleanUrl( url ) {
	const newUrl = url.replace(/∕/g, '/');
	return newUrl.endsWith( '/' ) ? newUrl : newUrl + '/';
}

module.exports = cleanUrl;
