export const buildObjectives = () =>
  $(".objectives__box")
    .toArray()
    .reduce(
      (acc, el) => [
        ...acc,
        {
          name: $(el).find("h2").text().trim(),
          tomestonesCount: 0,
          guideLink: $(el).prop("href"),
          img: $(el).find("img").prop("src"),
        },
      ],
      []
    );

export const buildExchanges = () =>
  $("table.item__list tbody > tr")
    .toArray()
    .reduce(
      (acc, el) => [
        ...acc,
        {
          name: $(el).find(".item__list__name").text().trim(),
          tomestonesCost: parseInt($(el).find("td").text().trim()),
          img: $(el).find("img").prop("src"),
          guideLink: $(el).find("a").prop("href"),
          type: "",
        },
      ],
      []
    );
