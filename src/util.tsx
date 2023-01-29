export const get_cameo = (cameos: Map<string, string>, name: string) => {
  const c = cameos.get(name.toLowerCase().replace("construction vehicle", "construction yard"));
  return c ? c : cameos.get("Missing");
};

