// Expo Config Plugin: makes MainActivity request to be shown over the
// lock screen and to turn the screen on, the same mechanism alarm clock
// apps use so the timer stays visible and operable without unlocking.
//
// Deliberately does NOT set FLAG_KEEP_SCREEN_ON here — that's owned
// exclusively by expo-keep-awake's useKeepAwake() (see TimerScreen.tsx),
// which is scoped to only stay active while the timer screen is mounted.
// Setting the flag unconditionally in onCreate would keep the screen on
// from the moment the app launches — including while sitting idle on the
// setup screen — fighting with the hook's own lifecycle-scoped
// add/clear of the exact same flag.
const { withMainActivity } = require("@expo/config-plugins");

const KOTLIN_MARKER = "// @generated withShowOverLockscreen";
const KOTLIN_SNIPPET = `
    ${KOTLIN_MARKER}
    window.addFlags(
      android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
        android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
    )
`;

const JAVA_MARKER = "// @generated withShowOverLockscreen";
const JAVA_SNIPPET = `
    ${JAVA_MARKER}
    getWindow().addFlags(
      android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
        android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
    );
`;

function insertAfterSuperOnCreate(contents, snippet, marker) {
  if (contents.includes(marker)) {
    return contents;
  }
  // Optional trailing `;` handles Java (`super.onCreate(saved);`) as well
  // as Kotlin (`super.onCreate(saved)`), which has no statement terminator.
  const superCallRegex = /super\.onCreate\([^)]*\)\s*;?\s*\n/;
  const match = contents.match(superCallRegex);
  if (!match) {
    throw new Error(
      "withShowOverLockscreen: could not find super.onCreate(...) in MainActivity"
    );
  }
  const insertAt = match.index + match[0].length;
  return contents.slice(0, insertAt) + snippet + contents.slice(insertAt);
}

const withShowOverLockscreen = (config) => {
  return withMainActivity(config, (config) => {
    const isKotlin = config.modResults.language === "kt";
    config.modResults.contents = insertAfterSuperOnCreate(
      config.modResults.contents,
      isKotlin ? KOTLIN_SNIPPET : JAVA_SNIPPET,
      isKotlin ? KOTLIN_MARKER : JAVA_MARKER
    );
    return config;
  });
};

module.exports = withShowOverLockscreen;
