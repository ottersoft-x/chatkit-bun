import type { ActionConfig } from "../actions.js";
import type { DynamicWidgetComponent, DynamicWidgetRoot, WidgetJson } from "./types.js";

type ActionConfigInput = {
  type: ActionConfig["type"];
  payload?: WidgetJson;
  handler?: ActionConfig["handler"];
  loadingBehavior?: ActionConfig["loadingBehavior"];
  streaming?: ActionConfig["streaming"];
  [key: string]: WidgetJson | undefined;
};

type WidgetPropValue =
  | WidgetJson
  | ActionConfigInput
  | DynamicWidgetComponent
  | DynamicWidgetComponent[]
  | undefined;
type WidgetProps = Record<string, WidgetPropValue>;

function component<TType extends string, TProps extends WidgetProps>(
  type: TType,
  props: TProps,
): { type: TType } & TProps {
  return { ...props, type };
}

type Children = DynamicWidgetComponent[];
type SingleChild = DynamicWidgetComponent;

export type BasicProps = WidgetProps & { children?: Children };
export function Basic(props: BasicProps = {}): DynamicWidgetRoot {
  return component("Basic", props) as DynamicWidgetRoot;
}

export type CardProps = WidgetProps & {
  children: Children;
  asForm?: boolean;
  confirm?: WidgetJson;
  cancel?: WidgetJson;
};
export function Card(props: CardProps): DynamicWidgetRoot {
  return component("Card", props) as DynamicWidgetRoot;
}

export type ListViewProps = WidgetProps & { children: DynamicWidgetComponent[] };
export function ListView(props: ListViewProps): DynamicWidgetRoot {
  return component("ListView", props) as DynamicWidgetRoot;
}

export type ListViewItemProps = WidgetProps & {
  children: Children;
  onClickAction?: ActionConfigInput;
};
export function ListViewItem(props: ListViewItemProps): DynamicWidgetComponent {
  return component("ListViewItem", props);
}

export type TextProps = WidgetProps & { value: string; streaming?: boolean };
export type TextWidget = { type: "Text" } & TextProps;
export function Text(props: TextProps): TextWidget {
  return component("Text", props);
}

export type MarkdownProps = WidgetProps & { value: string; streaming?: boolean };
export type MarkdownWidget = { type: "Markdown" } & MarkdownProps;
export function Markdown(props: MarkdownProps): MarkdownWidget {
  return component("Markdown", props);
}

export type TitleProps = WidgetProps & { value: string };
export function Title(props: TitleProps): DynamicWidgetComponent {
  return component("Title", props);
}

export type CaptionProps = WidgetProps & { value: string };
export function Caption(props: CaptionProps): DynamicWidgetComponent {
  return component("Caption", props);
}

export type BadgeProps = WidgetProps & { label: string };
export function Badge(props: BadgeProps): DynamicWidgetComponent {
  return component("Badge", props);
}

export type BoxProps = WidgetProps & { children?: Children };
export function Box(props: BoxProps = {}): DynamicWidgetComponent {
  return component("Box", props);
}

export type RowProps = WidgetProps & { children?: Children };
export function Row(props: RowProps = {}): DynamicWidgetComponent {
  return component("Row", props);
}

export type ColProps = WidgetProps & { children?: Children };
export function Col(props: ColProps = {}): DynamicWidgetComponent {
  return component("Col", props);
}

export type FormProps = WidgetProps & {
  children?: Children;
  onSubmitAction?: ActionConfigInput;
};
export function Form(props: FormProps = {}): DynamicWidgetComponent {
  return component("Form", props);
}

export function Divider(props: WidgetProps = {}): DynamicWidgetComponent {
  return component("Divider", props);
}

export type IconProps = WidgetProps & { name: string };
export function Icon(props: IconProps): DynamicWidgetComponent {
  return component("Icon", props);
}

export type ImageProps = WidgetProps & { src: string; alt?: string };
export function Image(props: ImageProps): DynamicWidgetComponent {
  return component("Image", props);
}

export type ButtonProps = WidgetProps & {
  label?: string;
  onClickAction?: ActionConfigInput;
};
export function Button(props: ButtonProps = {}): DynamicWidgetComponent {
  return component("Button", props);
}

export function Spacer(props: WidgetProps = {}): DynamicWidgetComponent {
  return component("Spacer", props);
}

export type SelectProps = WidgetProps & { name: string; options: WidgetJson[] };
export function Select(props: SelectProps): DynamicWidgetComponent {
  return component("Select", props);
}

export type DatePickerProps = WidgetProps & { name: string };
export function DatePicker(props: DatePickerProps): DynamicWidgetComponent {
  return component("DatePicker", props);
}

export type CheckboxProps = WidgetProps & { name: string; label?: string };
export function Checkbox(props: CheckboxProps): DynamicWidgetComponent {
  return component("Checkbox", props);
}

export type InputProps = WidgetProps & { name: string };
export function Input(props: InputProps): DynamicWidgetComponent {
  return component("Input", props);
}

export type LabelProps = WidgetProps & { value: string; fieldName: string };
export function Label(props: LabelProps): DynamicWidgetComponent {
  return component("Label", props);
}

export type RadioGroupProps = WidgetProps & { name: string; options?: WidgetJson[] };
export function RadioGroup(props: RadioGroupProps): DynamicWidgetComponent {
  return component("RadioGroup", props);
}

export type TextareaProps = WidgetProps & { name: string };
export function Textarea(props: TextareaProps): DynamicWidgetComponent {
  return component("Textarea", props);
}

export type TransitionProps = WidgetProps & { children: SingleChild };
export function Transition(props: TransitionProps): DynamicWidgetComponent {
  return component("Transition", props);
}

export type ChartProps = WidgetProps & {
  data: WidgetJson[];
  series: WidgetJson[];
  xAxis: string;
  showYAxis?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  barGap?: string | number;
  barCategoryGap?: string | number;
  flex?: string | number;
};
export function Chart(props: ChartProps): DynamicWidgetComponent {
  return component("Chart", props);
}
