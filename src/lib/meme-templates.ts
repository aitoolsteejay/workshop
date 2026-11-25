// The four meme formats from the Outbound Meme Prompt Kit, as fill-in templates.
// {{slot}} markers are replaced with the caption and the user's choices.

export interface MemeSlot {
  key: string;
  label: string;
  placeholder: string;
  defaultValue: string;
}

export interface MemeTemplate {
  id: string;
  name: string;
  feeling: string;
  bestFor: string;
  captionCount: 1 | 2; // "Reject and Approve" needs one line to reject and one to approve
  slots: MemeSlot[];
  prompt: string;
}

export const MEME_TEMPLATES: MemeTemplate[] = [
  {
    id: "graveyard",
    name: "The Graveyard",
    feeling: "Letting go of what is not working",
    bestFor: "Follow-ups with no reply, dead sequences, old habits",
    captionCount: 1,
    slots: [{ key: "outfit", label: "Your outfit", placeholder: "black puffer jacket", defaultValue: "black puffer jacket" }],
    prompt: `Using my uploaded photo as the face reference, create a meme-style image.

Scene: an underwater cartoon seabed graveyard in a classic animated sea-cartoon style, with painterly blue-teal water, coral, sand dollars and faint outlined flower-shaped clouds in the background.

A large rounded tombstone sits on the left with a small black ghost icon on top and the text “{{caption}}” in bold black sans-serif, centred. A small patch of white flowers sits at its base.

I am crouching beside the tombstone on the right in a {{outfit}}, smiling and making a peace sign at the camera.

Keep my face realistic and recognisable while the rest of the scene stays cartoon. Add a white bar above and below the image so it fits a 4:5 frame.`,
  },
  {
    id: "reject-approve",
    name: "The Reject and Approve",
    feeling: "Choosing the better way",
    bestFor: "Old way vs your way, before and after",
    captionCount: 2,
    slots: [{ key: "outfit", label: "Your outfit", placeholder: "bright orange puffer jacket", defaultValue: "bright orange puffer jacket" }],
    prompt: `Using my uploaded photo as the face reference, create a two-panel vertical meme in the classic “reject and approve” format.

Left column: two photo panels on a bright yellow background, with me wearing a {{outfit}}. Top panel: I look away with a hand raised in rejection. Bottom panel: I smile with my eyes closed and point approvingly at the camera.

Right column: two white panels separated by thick black lines, each with centred bold black sans-serif text.
Top text: “{{caption}}”
Bottom text: “{{caption2}}”

Clean, high contrast, square format.`,
  },
  {
    id: "astronaut",
    name: "The Astronaut",
    feeling: "Waiting and searching for a reply",
    bestFor: "Silent prospects, long sales cycles",
    captionCount: 1,
    slots: [{ key: "suit", label: "Suit colours", placeholder: "white and blue", defaultValue: "white and blue" }],
    prompt: `Using my uploaded photo as the face reference, create a meme image.

I am an astronaut in a {{suit}} spacesuit, waving one gloved hand, my face clearly visible through the helmet visor with a friendly smile.

Background: deep space with stars, small distant planets and a large Earth on the right. Realistic, cinematic style.

Above the image, add a plain white banner with the text “{{caption}}” in bold black sans-serif, centred on one line.

Landscape image placed inside a 4:5 frame with white space above and below.`,
  },
  {
    id: "conspiracy-board",
    name: "The Conspiracy Board",
    feeling: "Confusion about why it is not working",
    bestFor: "Listing problems, a stuck pipeline",
    captionCount: 1,
    slots: [
      { key: "problem1", label: "Problem 1", placeholder: "Pipeline stuck!", defaultValue: "Pipeline stuck!" },
      { key: "problem2", label: "Problem 2", placeholder: "LinkedIn ghosting?", defaultValue: "LinkedIn ghosting?" },
      { key: "problem3", label: "Problem 3", placeholder: "Outbound not working?", defaultValue: "Outbound not working?" },
      { key: "problem4", label: "Problem 4", placeholder: "No replies?", defaultValue: "No replies?" },
      { key: "outfit", label: "Your outfit", placeholder: "white blazer over a black t-shirt", defaultValue: "white blazer over a black t-shirt" },
    ],
    prompt: `Using my uploaded photo as the face reference, create a meme image.

Background: a cork board covered in pinned printouts, sticky notes, charts, newspaper clippings and red string connecting them all. Add bold headline cards reading “{{problem1}}”, “{{problem2}}”, “{{problem3}}” and “{{problem4}}”.

In the foreground, me in a {{outfit}}, looking frustrated and confused with both hands raised in front of my face and eyebrows furrowed. A table with a coffee mug sits behind me.

Above the image, add a white banner with the text “{{caption}}” in bold black sans-serif.

Portrait 4:5 format.`,
  },
];

export function fillMemePrompt(template: MemeTemplate, values: Record<string, string>): string {
  return template.prompt.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const v = values[key];
    return v && v.trim() ? v.trim() : match;
  });
}
