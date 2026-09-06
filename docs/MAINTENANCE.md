# 2026-09 Maintenance

## Verification

- `npm test`: numerical, state, projection, model format round trips and report regression tests.
- `npm run test:e2e`: actual browser generation, cancellation, invalid uploads, WebGL pixels and motion, projection downloads, model export and standalone report checks.
- `npm run lint`: repository-wide ESLint.
- `npm run build`: strict TypeScript checking followed by production bundling.

Use Node.js 22. Local Playwright tests use installed Google Chrome; CI installs Playwright Chromium. Screenshots are written under the ignored `test-results/` directory.

## Computation and Coordinates

### In-Scene Preview

After model generation, a debounced projection worker automatically produces the current preview. The three-dimensional receiver screen and the downloadable image use the same pixel buffer. A bounded set of actual ray paths is returned for visualization. Distance and illumination changes cancel outdated work and refresh the preview; manual rendering is still available.

The optical view uses a black background, white illumination and a colorless transmissive material. Its axial separation is compressed by default to keep the emitter, lens and receiver visible together and is explicitly labeled as a schematic. The actual-distance setting disables this compression. Ray calculations and export coordinates always retain their physical values.

The receiving surface faces negative Z, toward the incoming positive-Z light. Its opaque backing lies beyond the receiving plane, so the projection cannot show through the back. Both the front-view camera and the downloaded image use the illuminated-side coordinate convention: image right corresponds to negative world X, and image up to positive world Y. This is the opposite horizontal orientation from the former back-side preview. Raycaster tests verify the first visible surface, its normal, backing occlusion and texture coordinates independently of the default camera.

Image preprocessing preserves aspect ratio, composites transparency over black and downsamples to the selected bounded resolution before analysis. Target images use `[y][x]`; the legacy solver uses `[x][y]`, with an explicit conversion at its boundary.

Generation and projection run in separate Web Workers. A project revision invalidates pending results when input changes. Workers terminate on cancellation or invalidation. Projection distance and illumination changes preserve the model but clear prior projections.

Lens coordinates and dimensions are in millimeters. Parallel rays enter the flat back along positive Z, refract at both mesh intersections, and hit a screen beyond the shaped front. Total internal reflections and outgoing rays that do not reach the screen are rejected. This is a geometric optics preview, not a validated manufacturing solver.

### Point Source and Irradiance

The source selector supports collimated light and an ideal isotropic point source before the entrance surface. The point source has a positive entrance-distance control and X/Y offsets in world millimeters. Changes retrace the existing geometry; the inverse-design algorithm remains configured for parallel illumination and does not redesign the lens for a point source.

For a point source, each ray begins at the configured point and targets a sample on an entrance sampling plane. Projected bounding-box corners expand this sampling domain to cover side silhouettes. Uniform area samples carry power proportional to `I * cos(theta) / r^2 * sampleArea`, with distances in millimeters. A fixed reference distance of 1000 mm defines relative source strength: one unit gives unit irradiance on a surface normal to the source at one meter. Parallel-light intensity directly specifies relative entrance irradiance. These controls are not calibrated watts or radiometric measurements. See [PBRT's point-light model](https://pbr-book.org/4ed/Light_Sources/Point_Lights) and [radiometry definitions](https://pbr-book.org/4ed/Radiometry,_Spectra,_and_Color/Radiometry).

Ray power is bilinearly accumulated and divided by receiver pixel area, yielding a linear relative-irradiance array. The display uses `255 * (1 - exp(-irradiance))` with no frame-by-frame brightness normalization. Zero source intensity therefore gives an all-black result, and increasing source distance reduces incident power. Tests compare a planar slab against analytic Snell refraction, inverse-square falloff, the solid angle of a rectangular aperture and integrated receiver power. Fine lines and noise can result from triangular facets and finite sampling; they must not be interpreted as simulated wave interference.

Automatic receiver width estimates a field from geometric divergence and source offsets, including a 30% margin. It is not a guarantee that all refracted rays fit; users can select an explicit physical width. Samples outside that receiver are excluded and the received count is shown. The count is a sampling diagnostic, not overall optical efficiency. A screenshot is a texture display of this computed field; the target image is not read by the forward tracer. Fresnel losses, absorption, diffraction, dispersion and repeated internal reflections are not modeled. The Three.js glass appearance and auxiliary inspection lighting are presentation aids, not the numerical solver.

Intersection acceleration uses [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh). Tests include a parallel-sided slab and known refraction angles. Display brightness is tone-mapped ray density; the target image is not used as the simulated result.

## Export and Reports

STL, OBJ and PLY use the Three.js exporters. Units and scale apply to every format, including JSON. STL/OBJ/PLY do not reliably carry unit metadata, so importers must use the selected coordinate unit.

STEP uses planar `FACE_SURFACE` entities with `POLY_LOOP` bounds in a `FACETED_BREP_SHAPE_REPRESENTATION`. Every face has an in-plane reference direction; length, plane-angle and solid-angle units are explicit. Open or inconsistently oriented shells are rejected. See the [STEP schema definition](https://downloads.steptools.com/docs/stp_aim/html/t_faceted_brep_shape_representation.html). Test files are independently imported using [OpenCascade through occt-import-js](https://github.com/kovacsv/occt-import-js), which is a development-only dependency.

HTML reports embed raster image bytes and escape user-provided text. Dimensions come from the actual geometry, and volume sums signed tetrahedra before taking the absolute value. The report survives clearing the project or closing the application.

## Remaining Work

The inverse solver's physical surface-height calibration and achievable optical error still require experimental validation. Point-source inverse design, extended/area sources, wave optics, smooth CAD reconstruction and printer-specific slicing remain unsupported. Projects are currently in-memory, with export but no import or automatic recovery.
