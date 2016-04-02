nv.models.timelineChart = function(d) {
  "use strict";

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var timeline = nv.models.timeline();
  var tooltip = nv.models.tooltip();

  var margin = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    orient = 'left',
    reverse = false,
    width = 380,
    height = 30,
    tickFormat = null,
    dispatch = d3.dispatch('elementMouseover', 'elementMouseout', 'elementMousemove'),
    numberOfRecords = (d === undefined ? 0 : d.length),
    startTime = new Date().getTime(),
    endTime = new Date().getTime(),
    duration = 0,
    container = null;

  tooltip
    .duration(0)
    .headerEnabled(false)
    .valueFormatter(function(d, i) {
      return d + ' minutes';
    });

  function chart(selection) {
    selection.each(function(d, i) {
      var container = d3.select(this);
      nv.utils.initSVG(container);

      var availableWidth = width - margin.left - margin.right,
        availableHeight = height - margin.top - margin.bottom,
        that = this;

      chart.update = function() {
        chart(selection);
      };

      chart.container = this;

      // Setup containers and skeleton of chart
      var wrap = container.selectAll('g.nv-wrap.nv-timelineChart').data([d]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-timelineChart');
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g');

      gEnter.append('g').attr('class', 'nv-timelineWrap');
      gEnter.append('g').attr('class', 'nv-titles');

      // Setup Scales
      // Compute the new x-scale.
      var x1 = d3.scale.linear()
        .domain([startTime, endTime])
        .range([0, width]);

      // Retrieve the old x-scale, if this is an update.
      var x0 = this.__chart__ || d3.scale.linear()
        .domain([0, Infinity])
        .range(x1.range());

      timeline
        .width(availableWidth)
        .height(availableHeight)
        .options({
          width: width,
          height: height,
          startTime: startTime,
          endTime: endTime,
          margin: margin
        });

      var timelineWrap = g.select('.nv-timelineWrap');
      d3.transition(timelineWrap).call(timeline, d);


      // Compute the tick format.
      var format = function(n) {
        // tick text
        return moment(new Date(parseInt(n))).format('h:mm A');
      };

      var tickData = function() {
        var j = startTime;
        var tickArray = [];
        while (j <= endTime) {
          tickArray.push(j);
          j = j + 3600000;
        }
        return tickArray;
      };

      var tick = g.selectAll("g.tick")
        .data(tickData(), function(d) {
          return this.textContent || format(d);
        });

      if (i === numberOfRecords - 1) {
        g.append("line")
          .attr("x1", x1(startTime))
          .attr("y1", height + 10)
          .attr("x2", x1(endTime))
          .attr("y2", height + 10)
          .attr("stroke-width", 1)
          .attr("stroke", "black");

        // Initialize the ticks with the old scale, x0.
        var tickEnter = tick.enter().append("g")
          .attr("class", "tick")
          .attr("transform", timelineTranslate(x0))
          .style("opacity", 1e-6);

        tickEnter.append("line")
          .attr("y1", height)
          .attr("y2", height * 7 / 6);

        tickEnter.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "1em")
          .attr("y", height + 20)
          .text(format);

        // Transition the entering ticks to the new scale, x1.
        tickEnter.transition()
          .duration(duration)
          .attr("transform", timelineTranslate(x1))
          .style("opacity", 1);

        // Transition the updating ticks to the new scale, x1.
        var tickUpdate = tick.transition()
          .duration(duration)
          .attr("transform", timelineTranslate(x1))
          .style("opacity", 1);

        tickUpdate.select("line")
          .attr("y1", height)
          .attr("y2", height + 10);

        tickUpdate.select("text")
          .attr("y", height + 20);

        // Transition the exiting ticks to the new scale, x1.
        tick.exit().transition()
          .duration(duration)
          .attr("transform", timelineTranslate(x1))
          .style("opacity", 1e-6)
          .remove();
      }
    });

    d3.timer.flush();
    return chart;
  }

  function timelineTranslate(x) {
    return function(d) {
      return "translate(" + x(d) + ",0)";
    };
  }

  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  timeline.dispatch.on('elementMouseover.tooltip', function(evt) {
    evt['series'] = {
      key: evt.label,
      value: evt.value,
      color: evt.color
    };
    tooltip.data(evt).hidden(false);
  });

  timeline.dispatch.on('elementMouseout.tooltip', function(evt) {
    tooltip.hidden(true);
  });

  timeline.dispatch.on('elementMousemove.tooltip', function(evt) {
    tooltip();
  });

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.timeline = timeline;
  chart.dispatch = dispatch;
  chart.tooltip = tooltip;

  chart.options = nv.utils.optionsFunc.bind(chart);

  chart._options = Object.create({}, {
    // simple options, just get/set the necessary values
    width: {
      get: function() {
        return width;
      },
      set: function(_) {
        width = _;
      }
    },
    height: {
      get: function() {
        return height;
      },
      set: function(_) {
        height = _;
      }
    },
    tickFormat: {
      get: function() {
        return tickFormat;
      },
      set: function(_) {
        tickFormat = _;
      }
    },
    ticks: {
      get: function() {
        return ticks;
      },
      set: function(_) {
        ticks = _;
      }
    },
    noData: {
      get: function() {
        return noData;
      },
      set: function(_) {
        noData = _;
      }
    },

    // options that require extra logic in the setter
    margin: {
      get: function() {
        return margin;
      },
      set: function(_) {
        margin.top = _.top !== undefined ? _.top : margin.top;
        margin.right = _.right !== undefined ? _.right : margin.right;
        margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
        margin.left = _.left !== undefined ? _.left : margin.left;
      }
    },
    orient: {
      get: function() {
        return orient;
      },
      set: function(_) { // left, right, top, bottom
        orient = _;
        reverse = orient == 'right' || orient == 'bottom';
      }
    },
    startTime: {
      get: function() {
        return startTime;
      },
      set: function(_) { // left, right, top, bottom
        debugger;
        startTime = new Date(_).getTime();
      }
    },
    endTime: {
      get: function() {
        return endTime;
      },
      set: function(_) { // left, right, top, bottom
        endTime = new Date(_).getTime();
      }
    }
  });

  nv.utils.inheritOptions(chart, timeline);
  nv.utils.initOptions(chart);

  return chart;
};
