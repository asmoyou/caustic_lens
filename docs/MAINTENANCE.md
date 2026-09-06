# 2026-09 Maintenance

## Verification

- `npm test`: numerical, state, projection, model format round trips and report regression tests.
- `npm run test:e2e`: actual browser generation, cancellation, invalid uploads, WebGL pixels and motion, projection downloads, model export and standalone report checks.
- `npm run lint`: repository-wide ESLint.
- `npm run build`: strict TypeScript checking followed by production bundling.

Use Node.js 22. Local Playwright tests use installed Google Chrome; CI installs Playwright Chromium. Screenshots are written under the ignored `test-results/` directory.

## Computation and Coordinates

Image preprocessing preserves aspect ratio, composites transparency over black and downsamples to the selected bounded resolution before analysis. Target images use `[y][x]`; the legacy solver uses `[x][y]`, with an explicit conversion at its boundary.

Generation and projection run in separate Web Workers. A project revision invalidates pending results when input changes. Workers terminate on cancellation or invalidation. Projection distance and illumination changes preserve the model but clear prior projections.

Lens coordinates and dimensions are in millimeters. Parallel rays enter the flat back along positive Z, refract at both mesh intersections, and hit a screen beyond the shaped front. The screen covers 1.3 times the larger lens dimension; off-screen rays are not counted as received. Total internal reflections are rejected. This is a geometric optics preview, not a validated manufacturing solver.

Intersection acceleration uses [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh). Tests include a parallel-sided slab and known refraction angles. Display brightness is tone-mapped ray density; the target image is not used as the simulated result.

## Export and Reports

STL, OBJ and PLY use the Three.js exporters. Units and scale apply to every format, including JSON. STL/OBJ/PLY do not reliably carry unit metadata, so importers must use the selected coordinate unit.

STEP uses planar `FACE_SURFACE` entities with `POLY_LOOP` bounds in a `FACETED_BREP_SHAPE_REPRESENTATION`. Every face has an in-plane reference direction; length, plane-angle and solid-angle units are explicit. Open or inconsistently oriented shells are rejected. See the [STEP schema definition](https://downloads.steptools.com/docs/stp_aim/html/t_faceted_brep_shape_representation.html). Test files are independently imported using [OpenCascade through occt-import-js](https://github.com/kovacsv/occt-import-js), which is a development-only dependency.

HTML reports embed raster image bytes and escape user-provided text. Dimensions come from the actual geometry, and volume sums signed tetrahedra before taking the absolute value. The report survives clearing the project or closing the application.

## Remaining Work

The inverse solver's physical surface-height calibration and achievable optical error still require experimental validation. Arbitrary source distributions, wave optics, smooth CAD reconstruction and printer-specific slicing are outside this update. Projects are currently in-memory, with export but no import or automatic recovery.
