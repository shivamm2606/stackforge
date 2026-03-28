/**
 * QuickStack Presets
 * 
 * This is where we define the "secret sauce" for each project type.
 * Adding a new version is as simple as adding a new object here.
 */

export const presets = {
  stable: {
    name:        'Stable',
    react:       '^18.2.0',
    tailwind:    'v3',
    tailwindVer: '^3.4.1',
    router:      '^6.22.0',
    vite:        '^6.0.0',
    viteReact:   '^4.0.0'
  },

  latest: {
    name:         'Latest',
    react:        '^19.0.0',
    tailwind:     'v4',
    tailwindVer:  '^4.0.0',
    tailwindVite: '^4.0.0',
    router:       '^7.0.0',
    vite:         '^6.0.0',
    viteReact:    '^4.2.0'
  }
};
