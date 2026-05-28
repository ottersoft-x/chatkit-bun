import { describe, expect, test } from "bun:test";

import {
  Badge,
  Basic,
  Box,
  Button,
  Caption,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  diffWidget,
  DynamicWidgetRootSchema,
  Form,
  Icon,
  Image,
  Input,
  Label,
  ListView,
  ListViewItem,
  Markdown,
  RadioGroup,
  Row,
  Select,
  serializeWidget,
  Spacer,
  streamWidget,
  Text,
  Textarea,
  Title,
  Transition,
  Chart,
  WidgetTemplate,
  type DynamicWidgetRoot,
} from "../src/widgets";

const widgetFixtures = [
  "card_no_data",
  "card_with_data",
  "list_view_no_data",
  "list_view_with_data",
  "basic_root",
] as const;

describe("widgets", () => {
  test("has copied upstream widget fixtures", async () => {
    for (const name of widgetFixtures) {
      expect(await Bun.file(`tests/assets/widgets/${name}.widget`).exists()).toBe(true);
      expect(await Bun.file(`tests/assets/widgets/${name}.json`).exists()).toBe(true);
    }
  });

  test("serializes dynamic widgets while omitting undefined fields", () => {
    const widget: DynamicWidgetRoot = {
      type: "Card",
      key: undefined,
      children: [
        {
          type: "Text",
          value: "Hello",
          streaming: undefined,
          color: undefined,
        },
      ],
    };

    expect(serializeWidget(widget)).toEqual({
      type: "Card",
      children: [{ type: "Text", value: "Hello" }],
    });
  });

  test("validates dynamic widget roots", () => {
    expect(DynamicWidgetRootSchema.parse({ type: "Basic", children: [] })).toEqual({
      type: "Basic",
      children: [],
    });

    expect(() => DynamicWidgetRootSchema.parse({ type: "Text", value: "No root" })).toThrow();
  });

  test("builds static widgets with Python component names", () => {
    const widget = Card({
      children: [
        Text({ value: "Hello", streaming: undefined }),
        Button({ label: "Open", onClickAction: { type: "open" } }),
      ],
    });

    expect(serializeWidget(widget)).toEqual({
      type: "Card",
      children: [
        { type: "Text", value: "Hello" },
        { type: "Button", label: "Open", onClickAction: { type: "open" } },
      ],
    });
  });

  test("keeps catalogue component names when props include type", () => {
    const widget = Card({
      type: "Basic",
      children: [Text({ type: "Card", value: "Hello" } as any)],
    } as any);

    expect(serializeWidget(widget)).toEqual({
      type: "Card",
      children: [{ type: "Text", value: "Hello" }],
    });
  });

  test("exports the Python widget component catalogue", () => {
    const catalogue = [
      Basic({ children: [] }),
      ListView({ children: [ListViewItem({ children: [Text({ value: "Row" })] })] }),
      Markdown({ value: "**Hello**" }),
      Title({ value: "Title" }),
      Caption({ value: "Caption" }),
      Badge({ label: "New" }),
      Box({ children: [] }),
      Row({ children: [] }),
      Col({ children: [] }),
      Form({ children: [] }),
      Divider({}),
      Icon({ name: "check" }),
      Image({ src: "https://example.com/image.png", alt: "Image" }),
      Checkbox({ name: "ok", label: "OK" }),
      Spacer({}),
      Select({ name: "choice", options: [{ label: "A", value: "a" }] }),
      DatePicker({ name: "date" }),
      Input({ name: "input" }),
      Label({ label: "Name" }),
      RadioGroup({ name: "radio", options: [{ label: "A", value: "a" }] }),
      Textarea({ name: "body" }),
      Transition({ children: Text({ value: "Child" }) }),
      Chart({ data: [], xAxis: "x", yAxis: "y" }),
    ];

    expect(catalogue.map((component) => component.type)).toEqual([
      "Basic",
      "ListView",
      "Markdown",
      "Title",
      "Caption",
      "Badge",
      "Box",
      "Row",
      "Col",
      "Form",
      "Divider",
      "Icon",
      "Image",
      "Checkbox",
      "Spacer",
      "Select",
      "DatePicker",
      "Input",
      "Label",
      "RadioGroup",
      "Textarea",
      "Transition",
      "Chart",
    ]);
  });

  const fixtureData: Record<string, Record<string, unknown> | undefined> = {
    list_view_no_data: undefined,
    card_no_data: undefined,
    list_view_with_data: {
      items: [
        { id: "blue", label: "Blue line", color: "blue-500" },
        { id: "orange", label: "Orange line", color: "orange-500" },
        { id: "purple", label: "Purple line", color: "purple-500" },
      ],
    },
    card_with_data: {
      channel: "#proj-chatkit",
      time: "4:48 PM",
      user: { image: "/pam.png", name: "Pam Beesly" },
    },
  };

  for (const [name, data] of Object.entries(fixtureData)) {
    test(`renders ${name}.widget`, async () => {
      const template = await WidgetTemplate.fromFile(`tests/assets/widgets/${name}.widget`);
      const expected = await Bun.file(`tests/assets/widgets/${name}.json`).json();

      expect(template.build(data)).toEqual(expected);
    });
  }

  test("builds Basic roots through buildBasic", async () => {
    const template = await WidgetTemplate.fromFile("tests/assets/widgets/basic_root.widget");
    const expected = await Bun.file("tests/assets/widgets/basic_root.json").json();

    const widget = template.buildBasic({
      name: "Harry Potter",
      bio: "The boy who lived",
    });

    expect(widget).toEqual(expected);
    expect(widget.type).toBe("Basic");
  });

  test("throws on missing template variables", async () => {
    const template = await WidgetTemplate.fromFile("tests/assets/widgets/basic_root.widget");

    expect(() => template.build({ name: "Hermione Granger" })).toThrow();
  });

  test("preserves literal string content that looks like slice syntax", () => {
    const template = new WidgetTemplate({
      version: "1.0",
      name: "literal",
      template: '{"type":"Card","children":[{"type":"Text","value":"abc[1:]"}]}',
    });

    expect(template.build()).toEqual({
      type: "Card",
      children: [{ type: "Text", value: "abc[1:]" }],
    });
  });

  test("diffWidget returns no updates for equal widgets", () => {
    expect(diffWidget(Card({ children: [] }), Card({ children: [] }))).toEqual([]);
  });

  test("diffWidget streams cumulative Text value deltas", () => {
    expect(
      diffWidget(
        Card({ children: [Text({ id: "text", value: "Hello", streaming: true })] }),
        Card({ children: [Text({ id: "text", value: "Hello, world!", streaming: true })] }),
      ),
    ).toEqual([
      {
        type: "widget.streaming_text.value_delta",
        component_id: "text",
        delta: ", world!",
        done: false,
      },
    ]);
  });

  test("diffWidget marks streaming Text deltas done when streaming stops", () => {
    expect(
      diffWidget(
        Card({ children: [Text({ id: "text", value: "Hello", streaming: true })] }),
        Card({ children: [Text({ id: "text", value: "Hello, world!", streaming: false })] }),
      ),
    ).toEqual([
      {
        type: "widget.streaming_text.value_delta",
        component_id: "text",
        delta: ", world!",
        done: true,
      },
    ]);
  });

  test("diffWidget returns a root replacement for non-streaming text changes", () => {
    expect(
      diffWidget(
        Card({ children: [Text({ value: "Hello" })] }),
        Card({ children: [Text({ value: "world!" })] }),
      ),
    ).toEqual([
      {
        type: "widget.root.updated",
        widget: { type: "Card", children: [{ type: "Text", value: "world!" }] },
      },
    ]);
  });

  test("diffWidget returns a root replacement for primitive array prop changes", () => {
    expect(
      diffWidget(
        Card({ children: [Chart({ data: [1], xAxis: "x", yAxis: "y" })] }),
        Card({ children: [Chart({ data: [2], xAxis: "x", yAxis: "y" })] }),
      ),
    ).toEqual([
      {
        type: "widget.root.updated",
        widget: {
          type: "Card",
          children: [{ type: "Chart", data: [2], xAxis: "x", yAxis: "y" }],
        },
      },
    ]);
  });

  test("diffWidget returns a root replacement for nested array prop changes", () => {
    expect(
      diffWidget(
        Card({ children: [Chart({ data: [[{ value: 1 }]], xAxis: "x", yAxis: "y" })] }),
        Card({ children: [Chart({ data: [[{ value: 2 }]], xAxis: "x", yAxis: "y" })] }),
      ),
    ).toEqual([
      {
        type: "widget.root.updated",
        widget: {
          type: "Card",
          children: [{ type: "Chart", data: [[{ value: 2 }]], xAxis: "x", yAxis: "y" }],
        },
      },
    ]);
  });

  test("diffWidget does not stream Text-shaped objects inside data props", () => {
    expect(
      diffWidget(
        Card({ children: [Chart({ data: [{ type: "Text", id: "row", value: "A" }] })] }),
        Card({ children: [Chart({ data: [{ type: "Text", id: "row", value: "AB" }] })] }),
      ),
    ).toEqual([
      {
        type: "widget.root.updated",
        widget: {
          type: "Card",
          children: [{ type: "Chart", data: [{ type: "Text", id: "row", value: "AB" }] }],
        },
      },
    ]);
  });

  test("diffWidget rejects late streaming node ids", () => {
    expect(() =>
      diffWidget(
        Card({ children: [Text({ value: "Hello", streaming: true })] }),
        Card({ children: [Text({ id: "text", value: "Hello, world!", streaming: true })] }),
      ),
    ).toThrow("was not present when the widget was initially rendered");
  });

  test("diffWidget rejects non-cumulative streaming text updates", () => {
    expect(() =>
      diffWidget(
        Card({ children: [Text({ id: "text", value: "Hello", streaming: true })] }),
        Card({ children: [Text({ id: "text", value: "world!", streaming: true })] }),
      ),
    ).toThrow("not a prefix");
  });

  const testThread = {
    id: "thr_widget",
    created_at: "2026-05-27T00:00:00.000Z",
    status: { type: "active" as const },
    metadata: {},
  };

  async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
    const values: T[] = [];
    for await (const value of iterable) values.push(value);
    return values;
  }

  test("streamWidget emits a done event for one-off widgets", async () => {
    const events = await collect(
      streamWidget(testThread, Card({ children: [Text({ value: "Done" })] }), {
        copyText: "Done",
        generateId: () => "msg_widget",
        now: () => "2026-05-27T00:00:01.000Z",
      }),
    );

    expect(events).toEqual([
      {
        type: "thread.item.done",
        item: {
          id: "msg_widget",
          type: "widget",
          thread_id: "thr_widget",
          created_at: "2026-05-27T00:00:01.000Z",
          widget: { type: "Card", children: [{ type: "Text", value: "Done" }] },
          copy_text: "Done",
        },
      },
    ]);
  });

  test("streamWidget diffs async widget generators", async () => {
    async function* widgets() {
      yield Card({ children: [Text({ id: "text", value: "Hello", streaming: true })] });
      yield Card({ children: [Text({ id: "text", value: "Hello, world!", streaming: true })] });
      yield Card({ children: [Text({ id: "text", value: "Hello, world!", streaming: false })] });
    }

    const events = await collect(
      streamWidget(testThread, widgets(), {
        generateId: () => "msg_stream",
        now: () => "2026-05-27T00:00:02.000Z",
      }),
    );

    expect(events.map((event) => event.type)).toEqual([
      "thread.item.added",
      "thread.item.updated",
      "thread.item.done",
    ]);
    expect(events[1]).toEqual({
      type: "thread.item.updated",
      item_id: "msg_stream",
      update: {
        type: "widget.streaming_text.value_delta",
        component_id: "text",
        delta: ", world!",
        done: false,
      },
    });
  });

  test("streamWidget reuses the item creation timestamp for async widgets", async () => {
    async function* widgets() {
      yield Card({ children: [Text({ value: "Initial" })] });
      yield Card({ children: [Text({ value: "Final" })] });
    }

    const timestamps = [
      "2026-05-27T00:00:04.000Z",
      "2026-05-27T00:00:05.000Z",
      "2026-05-27T00:00:06.000Z",
    ];
    const events = await collect(
      streamWidget(testThread, widgets(), {
        generateId: () => "msg_created_at",
        now: () => timestamps.shift() ?? "2026-05-27T00:00:07.000Z",
      }),
    );

    expect(events[0]).toMatchObject({
      type: "thread.item.added",
      item: { created_at: "2026-05-27T00:00:04.000Z" },
    });
    expect(events.at(-1)).toMatchObject({
      type: "thread.item.done",
      item: { created_at: "2026-05-27T00:00:04.000Z" },
    });
  });

  test("streamWidget closes async widget iterators when consumers stop early", async () => {
    let returnCalled = false;
    const iterator: AsyncIterator<DynamicWidgetRoot> = {
      async next() {
        return {
          done: false,
          value: Card({ children: [Text({ value: "Initial" })] }),
        };
      },
      async return() {
        returnCalled = true;
        return { done: true, value: undefined };
      },
    };
    const widgets: AsyncIterable<DynamicWidgetRoot> = {
      [Symbol.asyncIterator]() {
        return iterator;
      },
    };

    for await (const event of streamWidget(testThread, widgets, {
      generateId: () => "msg_cancelled",
      now: () => "2026-05-27T00:00:08.000Z",
    })) {
      expect(event.type).toBe("thread.item.added");
      break;
    }

    expect(returnCalled).toBe(true);
  });

  test("streamWidget rejects empty async widget generators", async () => {
    async function* widgets() {}

    await expect(
      collect(
        streamWidget(testThread, widgets(), {
          generateId: () => "msg_empty",
          now: () => "2026-05-27T00:00:03.000Z",
        }),
      ),
    ).rejects.toThrow("yield an initial widget");
  });
});
