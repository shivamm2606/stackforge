import path from 'path';

/**
 * QuickStack Feature Plugins
 * 
 * Each feature tells the CLI where its template is located
 * and provides an optional hook to do extra work after it's copied.
 */

export const features = {
  auth: {
    name:         'Authentication',
    templatePath: path.join('features', 'auth'),
    
    // We can use this later to patch specific files if auth is selected
    onApply: async (target, preset) => {
      return; 
    }
  }
};
