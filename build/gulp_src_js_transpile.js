
'use strict'

var SRC_FILES  = 'src/js/**/*.js'
var DST_DIR  = 'dist/js'



const BABEL_CONFIG = {
	presets: ['es2015']
}



module.exports = function (gulp, plugins, arg_task_name)
{
	gulp.task(arg_task_name,
		() => {
			return gulp.src(SRC_FILES)
				.pipe( plugins.changed(DST_DIR) )
				.pipe( plugins.sourcemaps.init() )
				.pipe( plugins.babel(BABEL_CONFIG) )
				.pipe( plugins.sourcemaps.write('.') )
				.pipe( gulp.dest(DST_DIR) )
		}
	)
}

