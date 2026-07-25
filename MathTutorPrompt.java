/**
 * AP CSA-friendly prompt builder for Math Gap Finder.
 *
 * This class does not solve math itself. It builds clear instructions for a
 * vision-capable AI model after a student uploads a photo of their work.
 */
public final class MathTutorPrompt {

    private MathTutorPrompt() {
        // Prevents creating an unnecessary MathTutorPrompt object.
    }

    public static String build(String courseLevel, String studentNote,
                               String studentAnswer, boolean revealRequested) {
        String level = isBlank(courseLevel) ? "AP Calculus AB / BC" : courseLevel;
        String note = isBlank(studentNote) ? "No typed note was provided." : studentNote;
        String attemptedAnswer = isBlank(studentAnswer)
                ? "No final answer was typed."
                : studentAnswer;

        return "You are Math Gap Finder, a kind and accurate " + level + " tutor.\n\n"
                + "A student has uploaded handwritten math work. First read the image. "
                + "Ignore page margins, names, doodles, crossed-out scratch work, and unrelated writing. "
                + "Keep ONLY these two pieces of math: (1) the original question and "
                + "(2) the student's attempted solution. If either one is unreadable, say so clearly.\n\n"
                + "Then do this internally, in order:\n"
                + "1. Transcribe the original math question exactly.\n"
                + "2. Transcribe the student's important solution steps.\n"
                + "3. Solve the original problem carefully. Check domain restrictions, signs, "
                + "units, constants of integration, and calculus notation.\n"
                + "4. Compare the correct solution with the student's work.\n"
                + "5. Find the FIRST incorrect, missing, or unclear step.\n"
                + "6. Explain that one step supportively. Do not shame the student.\n\n"
                + "The student typed this extra context: " + note + "\n"
                + "The student typed this proposed final answer: " + attemptedAnswer + "\n\n"
                + "Return ONLY valid JSON with exactly these fields:\n"
                + "{\n"
                + "  \"question\": \"transcribed original question\",\n"
                + "  \"studentWork\": \"transcribed attempted solution\",\n"
                + "  \"answerCheck\": \"correct, incorrect, or needs-more-work\",\n"
                + "  \"firstIssue\": \"the first step to revisit\",\n"
                + "  \"explanation\": \"short helpful explanation without the final answer\",\n"
                + "  \"nextSteps\": [\"guided step 1\", \"guided step 2\", \"guided step 3\"],\n"
                + "  \"hiddenSolution\": \"complete correct solution and final answer\"\n"
                + "}\n\n"
                + (revealRequested
                    ? "The user clicked Reveal Answer. Include a complete hiddenSolution."
                    : "The user has NOT clicked Reveal Answer. Still calculate hiddenSolution, "
                      + "but do not repeat the final answer anywhere else in the JSON.");
    }

    private static boolean isBlank(String text) {
        return text == null || text.trim().isEmpty();
    }
}
